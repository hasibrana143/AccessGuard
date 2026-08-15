import { db } from './db';
import { logger } from './error-logger';

/**
 * Leading-indicator churn scoring (per docs/ops/CUSTOMER_SUCCESS.md §4).
 *
 * Signals (weights from the success spec):
 *  - S1 +3: no scan in 30 days (or never scanned)
 *  - S2 +2: no audit activity in 30 days (inactivity proxy)
 *  - S3 +4: billing trouble (subscriptionStatus past_due / unpaid)
 *  - S4 +1: plan usage at ceiling (>= 95% of scansThisMonth vs plan limit — TODO
 *           when usage counters land; excluded for now)
 *
 * Score >= 8 → high risk (manual outreach); >= 5 → at-risk (win-back email).
 * Runs weekly, gated by Redis `churn:last-run` timestamp.
 */

const SCAN_IDLE_DAYS = 30;
const ACTIVITY_IDLE_DAYS = 30;
const RISK_THRESHOLD = 5;
const HIGH_RISK_THRESHOLD = 8;

const BILLING_TROUBLE = new Set(['past_due', 'unpaid', 'canceled']);

export interface ChurnSignalBreakdown {
  noRecentScan: boolean;
  noRecentActivity: boolean;
  billingTrouble: boolean;
  score: number;
}

export function scoreOrg(
  args: {
    subscriptionStatus: string;
    lastScanAt: Date | null;
    hasRecentActivity: boolean;
  },
  now = new Date()
): ChurnSignalBreakdown {
  let score = 0;
  const scanCutoff = new Date(now.getTime() - SCAN_IDLE_DAYS * 24 * 60 * 60 * 1000);
  const activityCutoff = new Date(now.getTime() - ACTIVITY_IDLE_DAYS * 24 * 60 * 60 * 1000);

  const noRecentScan = !args.lastScanAt || args.lastScanAt < scanCutoff;
  const noRecentActivity = !args.hasRecentActivity;
  const billingTrouble = BILLING_TROUBLE.has(args.subscriptionStatus);

  if (noRecentScan) score += 3;
  if (noRecentActivity) score += 2;
  if (billingTrouble) score += 4;

  return { noRecentScan, noRecentActivity, billingTrouble, score };
}

export function riskBand(score: number): 'healthy' | 'at-risk' | 'high-risk' {
  if (score >= HIGH_RISK_THRESHOLD) return 'high-risk';
  if (score >= RISK_THRESHOLD) return 'at-risk';
  return 'healthy';
}

/**
 * Compute churn scores for every organization and persist them.
 * Returns the number of orgs whose score changed.
 */
export async function computeChurnScores(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - SCAN_IDLE_DAYS * 24 * 60 * 60 * 1000);

  const orgs = await db.organization.findMany({
    select: {
      id: true,
      subscriptionStatus: true,
      projects: { select: { lastScanAt: true }, where: { isActive: true } },
      _count: { select: { auditLogs: { where: { createdAt: { gte: cutoff } } } } },
    },
  });

  let changed = 0;
  for (const org of orgs) {
    const lastScanAt = org.projects.reduce<Date | null>(
      (latest, p) => (latest === null || (p.lastScanAt && p.lastScanAt > latest) ? p.lastScanAt : latest),
      null
    );

    const signal = scoreOrg({
      subscriptionStatus: org.subscriptionStatus,
      lastScanAt,
      hasRecentActivity: org._count.auditLogs > 0,
    }, now);

    const result = await db.organization.updateMany({
      where: { id: org.id, churnScore: { not: signal.score } },
      data: { churnScore: signal.score, lastChurnCalcAt: now },
    });
    if (result.count === 1) {
      changed++;
    } else {
      // Score unchanged — just refresh the calculation timestamp.
      await db.organization.updateMany({
        where: { id: org.id },
        data: { lastChurnCalcAt: now },
      });
    }
  }

  if (changed > 0) {
    logger.info({ changed }, 'Churn scores updated');
  }
  return changed;
}
