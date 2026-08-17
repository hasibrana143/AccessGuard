import { db } from './db';
import { scanUrl, scanUrlServer, scanFromHTML, type ScannerViolation } from '@/services/scanner';
import { checkPagesLimit } from './plan-limits';
import { getAlertSettings } from './notification-settings';
import { sendWebhookNotification } from './notifications';
import { sendScanCompleteEmail } from './email';
import { logger } from './error-logger';

export interface ExecuteScanOptions {
  projectId: string;
  url: string;
  userId: string;
  useBrowser?: boolean;
  html?: string;
  enforcePlanLimits?: boolean;
  sendNotifications?: boolean;
  scanConfig?: {
    requestDelay?: number;
    userAgent?: string;
    timeout?: number;
    retryCount?: number;
  };
}

export interface ExecuteScanResult {
  success: boolean;
  scanId?: string;
  violationsFound?: number;
  pagesScanned?: number;
  severityCounts?: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  riskScore?: number;
  errorMessage?: string;
}

async function createScanRecord(projectId: string): Promise<string> {
  const scan = await db.scan.create({
    data: { projectId, status: 'running' },
  });
  return scan.id;
}

async function updateScanCompleted(
  scanId: string,
  result: {
    pagesScanned: number;
    violations: ScannerViolation[];
    severityCounts: { critical: number; serious: number; moderate: number; minor: number };
    riskScore: number;
  }
): Promise<void> {
  await db.scan.update({
    where: { id: scanId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      pagesScanned: result.pagesScanned,
      violationsFound: result.violations.length,
      summary: JSON.stringify(result.severityCounts),
    },
  });
}

async function updateScanFailed(scanId: string, errorMessage: string): Promise<void> {
  await db.scan.update({
    where: { id: scanId },
    data: {
      status: 'failed',
      completedAt: new Date(),
      errorMessage: errorMessage.slice(0, 500),
      summary: JSON.stringify({ error: 'scan_failed' }),
    },
  });
}

async function createViolations(scanId: string, projectId: string, violations: ScannerViolation[]): Promise<void> {
  if (violations.length === 0) return;
  const violationsToCreate = violations.map((v) => ({
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

  for (let i = 0; i < violationsToCreate.length; i += 10) {
    await db.violation.createMany({ data: violationsToCreate.slice(i, i + 10) });
  }
}

async function updateProjectRiskScore(projectId: string, riskScore: number): Promise<void> {
  await db.project.update({
    where: { id: projectId },
    data: { lastScanAt: new Date(), riskScore },
  });
}

async function dispatchNotifications({
  projectId,
  projectName,
  projectUrl,
  orgId,
  orgName,
  violations,
  severityCounts,
  riskScore,
  pagesScanned,
}: {
  projectId: string;
  projectName: string;
  projectUrl: string;
  orgId: string;
  orgName: string;
  violations: ScannerViolation[];
  severityCounts: { critical: number; serious: number; moderate: number; minor: number };
  riskScore: number;
  pagesScanned: number;
}): Promise<void> {
  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { settings: true, name: true },
    });
    const orgSettings = org?.settings ? JSON.parse(org.settings) : {};
    const webhookUrl: string | undefined = orgSettings.slackWebhookUrl;
    const alerts = getAlertSettings(org?.settings ?? null);

    if (webhookUrl && alerts.criticalViolations) {
      const hasCritical = severityCounts.critical > 0;
      await sendWebhookNotification(webhookUrl, {
        title: `Scan Complete: ${projectName}`,
        text: `Scan of ${projectName} found ${violations.length} violation(s).\nCritical: ${severityCounts.critical} • Serious: ${severityCounts.serious} • Moderate: ${severityCounts.moderate} • Minor: ${severityCounts.minor}`,
        color: hasCritical ? 'red' : severityCounts.serious > 0 ? 'orange' : 'green',
        fields: [
          { label: 'Pages Scanned', value: String(pagesScanned) },
          { label: 'Risk Score', value: `${riskScore}/100` },
          { label: 'Project', value: projectName },
          { label: 'URL', value: projectUrl },
        ],
      });
    }

    if (alerts.scanCompleted) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const users = await db.user.findMany({
        where: { orgId },
        select: { email: true },
      });
      const emails = [...new Set(users.map(u => u.email))].slice(0, 5);
      for (const email of emails) {
        await sendScanCompleteEmail(
          email,
          projectName,
          violations.length,
          `${appUrl}/projects?projectId=${projectId}`
        );
      }
    }
  } catch (err) {
    logger.error({ err, projectId }, 'Failed to send scan notifications');
  }
}

export async function executeScan(options: ExecuteScanOptions): Promise<ExecuteScanResult> {
  const {
    projectId,
    url,
    userId,
    useBrowser = true,
    html,
    enforcePlanLimits = true,
    sendNotifications = true,
    scanConfig,
  } = options;

  let scanId: string | null = null;

  try {
    // Get project and org info
    const projectRecord = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, url: true, orgId: true, name: true, isActive: true },
    });
    if (!projectRecord) throw new Error('Project not found');
    if (!projectRecord.isActive) throw new Error('Project is inactive');

    const orgRecord = await db.organization.findUnique({
      where: { id: projectRecord.orgId },
      select: { plan: true, settings: true, name: true },
    });
    if (!orgRecord) throw new Error('Organization not found');

    // Enforce monthly pages quota before scanning
    if (enforcePlanLimits) {
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
        return { success: false, errorMessage: 'Monthly scan limit reached' };
      }
    }

    // Create scan record
    scanId = await createScanRecord(projectId);

    // Run the scan
    let result;
    if (html) {
      result = await scanFromHTML(html, url);
    } else if (useBrowser) {
      result = await scanUrl(url, { waitTime: 3000 });
      if (result.error && (result.error.includes('403') || result.error.includes('429'))) {
        logger.info({ projectId, error: result.error }, 'Browser scan blocked — falling back to server scan');
        result = await scanUrlServer(url, undefined, {
          requestDelay: scanConfig?.requestDelay ?? 500,
          userAgent: (scanConfig?.userAgent as 'default' | 'chrome' | 'firefox' | 'safari' | 'googlebot') ?? 'default',
          timeout: scanConfig?.timeout ?? 30000,
          retryCount: scanConfig?.retryCount ?? 3,
        });
      }
    } else {
      result = await scanUrlServer(url, undefined, {
        requestDelay: scanConfig?.requestDelay ?? 500,
        userAgent: (scanConfig?.userAgent as 'default' | 'chrome' | 'firefox' | 'safari' | 'googlebot') ?? 'default',
        timeout: scanConfig?.timeout ?? 30000,
        retryCount: scanConfig?.retryCount ?? 3,
      });
    }

    if (result.error) throw new Error(result.error);

    // Create violations
    await createViolations(scanId, projectId, result.violations);

    // Calculate severity counts
    const severityCounts = {
      critical: result.violations.filter((v) => v.severity === 'critical').length,
      serious: result.violations.filter((v) => v.severity === 'serious').length,
      moderate: result.violations.filter((v) => v.severity === 'moderate').length,
      minor: result.violations.filter((v) => v.severity === 'minor').length,
    };

    // Calculate risk score
    const riskScore = Math.max(0, Math.min(100, 100 - severityCounts.critical * 10 - severityCounts.serious * 5 - severityCounts.moderate * 2 - severityCounts.minor));

    // Update scan as completed
    await updateScanCompleted(scanId, {
      pagesScanned: result.pagesScanned,
      violations: result.violations,
      severityCounts,
      riskScore,
    });

    // Update project's risk score and last scan time
    await updateProjectRiskScore(projectId, riskScore);

    // Send notifications (webhook + email)
    if (sendNotifications) {
      await dispatchNotifications({
        projectId,
        projectName: projectRecord.name,
        projectUrl: projectRecord.url,
        orgId: projectRecord.orgId,
        orgName: orgRecord.name,
        violations: result.violations,
        severityCounts,
        riskScore,
        pagesScanned: result.pagesScanned,
      });
    }

    // Audit log
    await db.auditLog.create({
      data: {
        orgId: projectRecord.orgId,
        action: 'scan_completed',
        metadata: JSON.stringify({
          projectId,
          scanId,
          violationsFound: result.violations.length,
          pagesScanned: result.pagesScanned,
          severityCounts,
          riskScore,
        }),
      },
    });

    logger.info({ scanId, violations: result.violations.length }, 'Scan executed successfully');

    return {
      success: true,
      scanId,
      violationsFound: result.violations.length,
      pagesScanned: result.pagesScanned,
      severityCounts,
      riskScore,
    };
  } catch (err) {
    if (scanId) {
      try {
        await updateScanFailed(scanId, (err as Error).message?.slice(0, 500) || 'Scan failed');
      } catch (updateErr) {
        logger.error({ err: updateErr, scanId, projectId }, 'Failed to mark scan as failed');
      }
    }
    logger.error({ err, projectId }, 'Scan execution failed');
    return {
      success: false,
      scanId: scanId ?? undefined,
      errorMessage: (err as Error).message?.slice(0, 500) || 'Scan failed',
    };
  }
}