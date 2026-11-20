import { PRICING_PLANS, type PlanType } from '@/lib/stripe';
import { db } from '@/lib/db';

export interface PlanLimits {
  websites: number;
  pagesMonitored: number; // pages monitored (metered), not page-scans
  smartScheduling: boolean;
}

export interface PagesMeterResult {
  allowed: boolean;
  limit: number;
  current: number;
  overage: number;
}

export function getPlanLimits(plan: string, settings?: string | null): PlanLimits {
  const found = PRICING_PLANS.find((p) => p.id === (plan as PlanType));
  const defaults: PlanLimits = found
    ? { websites: found.limits.websites, pagesMonitored: found.limits.pagesPerMonth, smartScheduling: found.id !== 'free' }
    : { websites: 1, pagesMonitored: 500, smartScheduling: false };

  // Allow explicit override stored in org settings (e.g. after plan downgrade).
  // Overrides may only RESTRICT below the plan's default — they may never raise it.
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      const overrideWebsites = parsed.planLimits?.websites;
      const overridePages = parsed.planLimits?.pagesMonitored;
      const overrideScheduling = parsed.planLimits?.smartScheduling;
      if (typeof overrideWebsites === 'number' && Number.isFinite(overrideWebsites) && overrideWebsites >= 0 && overrideWebsites <= defaults.websites) {
        defaults.websites = Math.floor(overrideWebsites);
      }
      if (typeof overridePages === 'number' && Number.isFinite(overridePages) && overridePages >= 0 && overridePages <= defaults.pagesMonitored) {
        defaults.pagesMonitored = Math.floor(overridePages);
      }
      if (typeof overrideScheduling === 'boolean') {
        defaults.smartScheduling = overrideScheduling;
      }
    } catch {
      // Ignore malformed settings
    }
  }

  return defaults;
}

export async function checkWebsiteLimit(
  orgId: string,
  plan: string,
  settings?: string | null
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const limits = getPlanLimits(plan, settings);
  const current = await db.project.count({ where: { orgId, isActive: true } });
  const allowed = limits.websites === -1 || current < limits.websites;
  return { allowed, limit: limits.websites === -1 ? Infinity : limits.websites, current };
}

/**
 * Pages monitored meter — counts unique project pages in crawlConfig, not scan executions.
 * This makes pricing predictable: you pay for coverage, not scan frequency.
 */
export async function checkPagesMonitoredLimit(
  orgId: string,
  plan: string,
  settings?: string | null
): Promise<PagesMeterResult> {
  const limits = getPlanLimits(plan, settings);
  if (limits.pagesMonitored === -1) {
    return { allowed: true, limit: Infinity, current: 0, overage: 0 };
  }

  // Count active projects and their maxPages from crawlConfig
  const projects = await db.project.findMany({
    where: { orgId, isActive: true },
    select: { crawlConfig: true },
  });

  let current = 0;
  for (const project of projects) {
    try {
      const config = project.crawlConfig ? JSON.parse(project.crawlConfig) : {};
      current += config.maxPages ?? 100;
    } catch {
      current += 100; // default
    }
  }

  const overage = Math.max(0, current - limits.pagesMonitored);
  return {
    allowed: current <= limits.pagesMonitored || limits.pagesMonitored === -1,
    limit: limits.pagesMonitored,
    current,
    overage,
  };
}

/** Backwards compatibility — still used by scan-executor for scan-time quota */
export async function checkPagesLimit(
  orgId: string,
  plan: string,
  settings?: string | null
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const limits = getPlanLimits(plan, settings);
  if (limits.pagesMonitored === -1) {
    return { allowed: true, limit: Infinity, current: 0 };
  }
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const agg = await db.scan.aggregate({
    where: {
      project: { orgId },
      createdAt: { gte: startOfMonth },
    },
    _sum: { pagesScanned: true },
  });
  const current = agg._sum.pagesScanned || 0;
  return { allowed: current < limits.pagesMonitored, limit: limits.pagesMonitored, current };
}

/** Smart scheduling — determine if a project should be scanned today */
export interface ScanScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  priority: 'critical' | 'high' | 'normal' | 'low'; // based on project risk/importance
}

export function getScanFrequency(config: ScanScheduleConfig, lastScanAt: Date | null): boolean {
  if (!lastScanAt) return true; // never scanned
  const now = new Date();
  const diffHours = (now.getTime() - lastScanAt.getTime()) / (1000 * 60 * 60);
  
  switch (config.frequency) {
    case 'daily': return diffHours >= 20;
    case 'weekly': return diffHours >= 168; // 7 days
    case 'monthly': return diffHours >= 720; // 30 days
    default: return diffHours >= 168;
  }
}

/** Assign frequency based on project risk score and plan */
export function assignScanFrequency(
  riskScore: number | null,
  plan: string,
  projectUrls?: string[]
): ScanScheduleConfig {
  const isHighPriority = (riskScore ?? 50) >= 70;
  const isEnterprise = plan === 'enterprise';
  
  if (isEnterprise && isHighPriority) return { frequency: 'daily', priority: 'critical' };
  if (isEnterprise) return { frequency: 'daily', priority: 'high' };
  if (isHighPriority) return { frequency: 'daily', priority: 'high' };
  if (plan === 'agency' || plan === 'growth') return { frequency: 'weekly', priority: 'normal' };
  return { frequency: 'weekly', priority: 'normal' };
}
