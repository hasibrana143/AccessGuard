import { db } from './db';
import { scanUrl, scanUrlServer, scanFromHTML, crawlSite, type ScannerViolation } from '@/services/scanner';
import { checkPagesLimit } from './plan-limits';
import { getAlertSettings } from './notification-settings';
import { sendWebhookNotification } from './notifications';
import { sendScanCompleteEmail } from './email';
import { logger } from './error-logger';
import { generateFingerprint, reconcileViolations } from '@/services/scanner/strategies/fingerprint';

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
  regression?: {
    new: number;
    fixed: number;
    regressed: number;
    persisting: number;
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
    regression?: { new: number; fixed: number; regressed: number; persisting: number };
  }
): Promise<void> {
  await db.scan.update({
    where: { id: scanId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      pagesScanned: result.pagesScanned,
      violationsFound: result.violations.length,
      summary: JSON.stringify({
        severity: result.severityCounts,
        regression: result.regression,
      }),
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

async function createViolations(scanId: string, projectId: string, violations: ScannerViolation[]): Promise<{
  new: number;
  fixed: number;
  regressed: number;
  persisting: number;
}> {
  if (violations.length === 0) return { new: 0, fixed: 0, regressed: 0, persisting: 0 };

  // Generate fingerprints for new violations
  const violationsWithFingerprint = violations.map((v) => ({
    ...v,
    fingerprint: generateFingerprint(v),
  }));

  // Fetch previous scan's violations for reconciliation
  const previousScan = await db.scan.findFirst({
    where: { projectId, status: 'completed', id: { not: scanId } },
    orderBy: { completedAt: 'desc' },
    select: { id: true },
  });

  let previousViolations: Array<{
    id: string;
    fingerprint: string | null;
    ruleId: string;
    url: string;
    elementSelector: string | null;
    elementHtml: string | null;
    severity: string;
    status: string;
  }> = [];

  if (previousScan) {
    previousViolations = await db.violation.findMany({
      where: { scanId: previousScan.id, deletedAt: null },
      select: { id: true, fingerprint: true, ruleId: true, url: true, elementSelector: true, elementHtml: true, severity: true, status: true },
    });
  }

  // Reconcile
  const current = violationsWithFingerprint.map(v => ({ violation: v, fingerprint: v.fingerprint }));
  const previous = previousViolations.map(v => ({ violation: v, fingerprint: v.fingerprint!, id: v.id }));
  const { new: newViolations, persisting, fixed, regressed } = reconcileViolations(current, previous);

  // Prepare violations to create (new + regressed)
  const toCreate = [
    ...newViolations.map(({ violation }) => violation),
    ...regressed.map(({ current }) => current),
  ].map((violation) => ({
    scanId,
    projectId,
    ruleId: violation.ruleId,
    wcagCriteria: violation.wcagCriteria,
    severity: violation.severity,
    url: violation.url,
    elementSelector: violation.elementSelector,
    elementPath: violation.elementPath ? JSON.stringify(violation.elementPath) : null,
    helpUrl: violation.helpUrl,
    elementHtml: violation.elementHtml,
    description: violation.description,
    remediationCode: violation.remediationCode,
    aiExplanation: violation.aiExplanation,
    aiConfidenceScore: violation.aiConfidenceScore,
    fingerprint: violation.fingerprint,
    status: 'open' as const,
  }));

  // Persisting violations keep their previous status (open/ignored/false_positive)
  // const persistingIds = persisting.map(p => p.previous.id); // not used, we create new rows

  // Fixed violations: mark as fixed, set fixedAt
  const fixedIds = fixed.map(f => f.previous.id);

  // Execute in transaction
  await db.$transaction(async (tx) => {
    // Create new + regressed violations
    for (let i = 0; i < toCreate.length; i += 10) {
      await tx.violation.createMany({ data: toCreate.slice(i, i + 10) });
    }

    // Update persisting violations to link to new scan (create new row for scan history)
    for (let i = 0; i < persisting.length; i += 10) {
      const batch = persisting.slice(i, i + 10).map(({ current, fingerprint }) => ({
        scanId,
        projectId,
        ruleId: current.ruleId,
        wcagCriteria: current.wcagCriteria,
        severity: current.severity,
        url: current.url,
        elementSelector: current.elementSelector,
        elementPath: current.elementPath ? JSON.stringify(current.elementPath) : null,
        helpUrl: current.helpUrl,
        elementHtml: current.elementHtml,
        description: current.description,
        remediationCode: current.remediationCode,
        aiExplanation: current.aiExplanation,
        aiConfidenceScore: current.aiConfidenceScore,
        fingerprint,
        status: current.status || 'open',
      }));
      await tx.violation.createMany({ data: batch });
    }

    // Mark fixed violations
    if (fixedIds.length > 0) {
      await tx.violation.updateMany({
        where: { id: { in: fixedIds } },
        data: { status: 'fixed', fixedAt: new Date() },
      });
    }

    // Mark regressed violations' previous instances as fixed (they were fixed but came back)
    const regressedPrevIds = regressed.map(r => r.previous.id);
    if (regressedPrevIds.length > 0) {
      await tx.violation.updateMany({
        where: { id: { in: regressedPrevIds }, status: 'fixed' },
        data: { status: 'open', fixedAt: null },
      });
    }
  });

  return {
    new: newViolations.length,
    fixed: fixed.length,
    regressed: regressed.length,
    persisting: persisting.length,
  };
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
  regression,
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
  regression?: { new: number; fixed: number; regressed: number; persisting: number };
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

    // Count new/regressed critical and serious violations
    const newCritical = violations.filter(v => v.severity === 'critical').length;
    const newSerious = violations.filter(v => v.severity === 'serious').length;
    const regressedCritical = regression ? violations.filter(v => v.severity === 'critical').length : 0;
    const regressedSerious = regression ? violations.filter(v => v.severity === 'serious').length : 0;

    // Alert on NEW critical violations (regression.new)
    const shouldAlertCritical = (alerts.criticalViolations || alerts.newCritical) && 
      (regression && regression.new > 0 && (newCritical > 0 || regressedCritical > 0));
    
    // Alert on NEW serious violations
    const shouldAlertSerious = alerts.newSerious && 
      (regression && regression.new > 0 && (newSerious > 0 || regressedSerious > 0));

    if (webhookUrl && (shouldAlertCritical || shouldAlertSerious)) {
      const newCriticalCount = regression ? regression.new : newCritical;
      const hasCritical = shouldAlertCritical;
      await sendWebhookNotification(webhookUrl, {
        title: `AccessGuard Alert: ${projectName}`,
        text: `Scan found ${regression?.new || 0} new violation(s) (${newCriticalCount} critical, ${newSerious} serious).`,
        color: hasCritical ? 'red' : 'orange',
        fields: [
          { label: 'New Violations', value: String(regression?.new || 0) },
          { label: 'Fixed', value: String(regression?.fixed || 0) },
          { label: 'Regressed', value: String(regression?.regressed || 0) },
          { label: 'Persisting', value: String(regression?.persisting || 0) },
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
      select: { id: true, url: true, orgId: true, name: true, isActive: true, crawlConfig: true },
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

    // Parse crawlConfig from project
    let crawlConfig: {
      maxPages?: number;
      excludePaths?: string[];
      includeSubdomains?: boolean;
      waitForSelector?: string;
      waitTime?: number;
      takeScreenshot?: boolean;
      viewports?: Array<'desktop' | 'mobile'>;
    } = {};
    if (projectRecord.crawlConfig) {
      try {
        crawlConfig = JSON.parse(projectRecord.crawlConfig);
      } catch {
        logger.warn({ projectId }, 'Invalid crawlConfig JSON, using defaults');
      }
    }

    // Determine if we should crawl (multi-page) or single-page scan
    const shouldCrawl = !html && (crawlConfig.maxPages ?? 1) > 1;

    // Run the scan
    let result;
    if (html) {
      result = await scanFromHTML(html, url);
    } else if (shouldCrawl) {
      // Full-site crawl
      result = await crawlSite(url, {
        ...crawlConfig,
        ...scanConfig,
        viewports: crawlConfig.viewports ?? ['desktop', 'mobile'],
      });
      if (result.error && (result.error.includes('403') || result.error.includes('429'))) {
        logger.info({ projectId, error: result.error }, 'Crawl blocked — falling back to single-page scan');
        result = await scanUrl(url, { waitTime: 3000, viewports: ['desktop', 'mobile'] });
      }
    } else if (useBrowser) {
      result = await scanUrl(url, { waitTime: 3000, viewports: ['desktop', 'mobile'] });
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
    const regression = await createViolations(scanId, projectId, result.violations);

    // Calculate severity counts
    const severityCounts = {
      critical: result.violations.filter((v) => v.severity === 'critical').length,
      serious: result.violations.filter((v) => v.severity === 'serious').length,
      moderate: result.violations.filter((v) => v.severity === 'moderate').length,
      minor: result.violations.filter((v) => v.severity === 'minor').length,
    };

    // Transparent risk score: weighted severity (0-100, lower = better)
    // Methodology: 100 - (critical*10 + serious*5 + moderate*2 + minor*1)
    // Documented at: docs/engineering/RISK_SCORE_METHODOLOGY.md
    const riskScore = Math.max(0, Math.min(100, 100 - severityCounts.critical * 10 - severityCounts.serious * 5 - severityCounts.moderate * 2 - severityCounts.minor * 1));

    // Update scan as completed
    await updateScanCompleted(scanId, {
      pagesScanned: result.pagesScanned,
      violations: result.violations,
      severityCounts,
      riskScore,
      regression,
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
        regression,
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

    logger.info({ scanId, violations: result.violations.length, regression }, 'Scan executed successfully');

    return {
      success: true,
      scanId,
      violationsFound: result.violations.length,
      pagesScanned: result.pagesScanned,
      severityCounts,
      regression,
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