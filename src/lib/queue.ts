import { Queue, Worker, type Job } from 'bullmq';
import { getRedis } from './redis';
import { logger } from './error-logger';
import { validateTargetUrl } from './url-validation';
import type { ScannerViolation } from '@/services/scanner';

let scanQueue: Queue | null = null;
let scanWorker: Worker | null = null;

const connection = {
  connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
};

export function getScanQueue(): Queue {
  if (!scanQueue) {
    scanQueue = new Queue('scans', {
      ...connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    logger.info('Scan queue initialized');
  }
  return scanQueue;
}

export async function enqueueScan(projectId: string, url: string, userId: string, options?: {
  useBrowser?: boolean;
  html?: string;
  priority?: number;
}): Promise<string> {
  const queue = getScanQueue();
  const urlCheck = await validateTargetUrl(url);
  if (!urlCheck.ok) {
    logger.warn({ projectId, url, error: urlCheck.error }, 'Scan not enqueued — blocked target');
    throw new Error(`Blocked target: ${urlCheck.error}`);
  }
  const job = await queue.add('execute-scan', {
    projectId,
    url: urlCheck.url || url,
    userId,
    useBrowser: options?.useBrowser ?? true,
    html: options?.html,
    createdAt: new Date().toISOString(),
  }, {
    priority: options?.priority ?? 0,
    jobId: `scan:${projectId}:${Date.now()}`,
  });
  logger.info({ projectId, jobId: job.id }, 'Scan enqueued');
  return job.id ?? '';
}

export function startScanWorker() {
  if (scanWorker) return;

  const redis = getRedis();
  if (!redis) {
    logger.warn('Redis not available — scan worker not started');
    return;
  }

  scanWorker = new Worker('scans', async (job: Job) => {
    const { projectId, url, useBrowser, html } = job.data;
    logger.info({ jobId: job.id, projectId }, 'Processing scan job');

    let scan: { id: string } | null = null;

    try {
      const { scanUrl, scanFromHTML, scanUrlServer } = await import('@/services/scanner');
      const { db } = await import('@/lib/db');
      const { checkPagesLimit } = await import('@/lib/plan-limits');

      // Enforce monthly pages quota before scanning
      const projectRecord = await db.project.findUnique({
        where: { id: projectId },
        select: { orgId: true, name: true, url: true },
      });
      if (!projectRecord) throw new Error('Project not found');

      const orgRecord = await db.organization.findUnique({
        where: { id: projectRecord.orgId },
        select: { plan: true, settings: true },
      });
      if (!orgRecord) throw new Error('Organization not found');

      const pageCheck = await checkPagesLimit(projectRecord.orgId, orgRecord.plan || 'free', orgRecord.settings);
      if (!pageCheck.allowed) {
        await db.scan.create({
          data: {
            projectId,
            status: 'failed',
            pagesScanned: 0,
            violationsFound: 0,
            errorMessage: 'Monthly scan limit reached',
            summary: JSON.stringify({ error: 'plan_limit' }),
          },
        });
        await db.auditLog.create({
          data: {
            orgId: projectRecord.orgId,
            action: 'scan_blocked_plan_limit',
            metadata: JSON.stringify({ projectId, current: pageCheck.current, limit: pageCheck.limit }),
          },
        });
        logger.warn({ projectId, current: pageCheck.current, limit: pageCheck.limit }, 'Scan blocked by monthly page limit');
        return;
      }

      const scanRecord = await db.scan.create({
        data: { projectId, status: 'running' },
      });
      scan = scanRecord;
      const scanId = scanRecord.id;

      let result;
      if (html) {
        result = await scanFromHTML(html, url);
      } else if (useBrowser) {
        result = await scanUrl(url, { waitTime: 3000 });
        if (result.error && (result.error.includes('403') || result.error.includes('429'))) {
          logger.info({ projectId, error: result.error }, 'Browser scan blocked — falling back to server scan');
          result = await scanUrlServer(url, undefined, { requestDelay: 500, userAgent: 'default', timeout: 30000, retryCount: 3 });
        }
      } else {
        result = await scanUrlServer(url, undefined, { requestDelay: 500, userAgent: 'default', timeout: 30000, retryCount: 3 });
      }

      if (result.error) throw new Error(result.error);

      const violationsToCreate = result.violations.map((v: ScannerViolation) => ({
        scanId,
        projectId,
        ruleId: v.ruleId,
        wcagCriteria: v.wcagCriteria,
        severity: v.severity,
        url: v.url,
        elementSelector: v.elementSelector,
        elementHtml: v.elementHtml,
        description: v.description,
        remediationCode: v.remediationCode,
        aiExplanation: v.aiExplanation,
        aiConfidenceScore: v.aiConfidenceScore,
        status: 'open' as const,
      }));

      if (violationsToCreate.length > 0) {
        for (let i = 0; i < violationsToCreate.length; i += 10) {
          await db.violation.createMany({ data: violationsToCreate.slice(i, i + 10) });
        }
      }

      const severityCounts = {
        critical: result.violations.filter((v: ScannerViolation) => v.severity === 'critical').length,
        serious: result.violations.filter((v: ScannerViolation) => v.severity === 'serious').length,
        moderate: result.violations.filter((v: ScannerViolation) => v.severity === 'moderate').length,
        minor: result.violations.filter((v: ScannerViolation) => v.severity === 'minor').length,
      };

      let riskScore = Math.max(0, Math.min(100, 100 - severityCounts.critical * 10 - severityCounts.serious * 5 - severityCounts.moderate * 2 - severityCounts.minor));

      await db.scan.update({
        where: { id: scan.id },
        data: { status: 'completed', completedAt: new Date(), pagesScanned: result.pagesScanned, violationsFound: result.violations.length, summary: JSON.stringify(severityCounts) },
      });

      await db.project.update({
        where: { id: projectId },
        data: { lastScanAt: new Date(), riskScore },
      });

      // Send webhook + email notifications if configured
      try {
        const projectRecord = await db.project.findUnique({
          where: { id: projectId },
          select: { orgId: true, name: true, url: true },
        });
        if (projectRecord) {
          const org = await db.organization.findUnique({
            where: { id: projectRecord.orgId },
            select: { settings: true, name: true },
          });
          const orgSettings = org?.settings ? JSON.parse(org.settings) : {};
          const webhookUrl: string | undefined = orgSettings.slackWebhookUrl;
          const alerts = orgSettings.alerts || {};

          if (webhookUrl && alerts.criticalViolations !== false) {
            const { sendWebhookNotification } = await import('@/lib/notifications');
            const hasCritical = severityCounts.critical > 0;
            await sendWebhookNotification(webhookUrl, {
              title: `Scan Complete: ${projectRecord.name}`,
              text: `Scan of ${projectRecord.name} found ${result.violations.length} violation(s).\nCritical: ${severityCounts.critical} • Serious: ${severityCounts.serious} • Moderate: ${severityCounts.moderate} • Minor: ${severityCounts.minor}`,
              color: hasCritical ? 'red' : severityCounts.serious > 0 ? 'orange' : 'green',
              fields: [
                { label: 'Pages Scanned', value: String(result.pagesScanned) },
                { label: 'Risk Score', value: `${riskScore}/100` },
                { label: 'Project', value: projectRecord.name },
                { label: 'URL', value: projectRecord.url },
              ],
            });
          }

          if (alerts.scanComplete !== false) {
            const { sendScanCompleteEmail } = await import('@/lib/email');
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const users = await db.user.findMany({
              where: { orgId: projectRecord.orgId },
              select: { email: true },
            });
            const emails = [...new Set(users.map(u => u.email))].slice(0, 5);
            for (const email of emails) {
              await sendScanCompleteEmail(
                email,
                projectRecord.name,
                result.violations.length,
                `${appUrl}/projects?projectId=${projectId}`
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err, projectId }, 'Failed to send scan notifications');
      }

      logger.info({ jobId: job.id, scanId: scan.id, violations: result.violations.length }, 'Scan job completed');
    } catch (err) {
      if (scan) {
        try {
          const { db } = await import('@/lib/db');
          await db.scan.update({
            where: { id: scan.id },
            data: { status: 'failed', completedAt: new Date(), errorMessage: (err as Error).message?.slice(0, 500) || 'Scan failed', summary: JSON.stringify({ error: (err as Error).message || 'scan_failed' }) },
          });
        } catch (updateErr) {
          logger.error({ err: updateErr, jobId: job.id, projectId }, 'Failed to mark scan as failed');
        }
      }
      logger.error({ err, jobId: job.id, projectId }, 'Scan job failed');
      throw err;
    }
  }, {
    ...connection,
    concurrency: 3,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  scanWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Scan worker completed');
  });

  scanWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Scan worker job failed');
  });

  scanWorker.on('error', (err) => {
    logger.error({ err }, 'Scan worker error');
  });

  logger.info('Scan worker started');
}

export async function getQueueStatus() {
  const queue = getScanQueue();
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

export async function closeQueue() {
  await scanWorker?.close();
  await scanQueue?.close();
  scanWorker = null;
  scanQueue = null;
}
