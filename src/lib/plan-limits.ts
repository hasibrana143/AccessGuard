import { PRICING_PLANS, type PlanType } from '@/lib/stripe';
import { db } from '@/lib/db';

export interface PlanLimits {
  websites: number;
  pagesPerMonth: number;
}

export function getPlanLimits(plan: string, settings?: string | null): PlanLimits {
  const found = PRICING_PLANS.find((p) => p.id === (plan as PlanType));
  const defaults: PlanLimits = found
    ? { websites: found.limits.websites, pagesPerMonth: found.limits.pagesPerMonth }
    : { websites: 1, pagesPerMonth: 500 };

  // Allow explicit override stored in org settings (e.g. after plan downgrade).
  // Overrides may only RESTRICT below the plan's default — they may never raise it.
  if (settings) {
    try {
      const parsed = JSON.parse(settings);
      const overrideWebsites = parsed.planLimits?.websites;
      const overridePages = parsed.planLimits?.pagesPerMonth;
      if (typeof overrideWebsites === 'number' && Number.isFinite(overrideWebsites) && overrideWebsites >= 0 && overrideWebsites <= defaults.websites) {
        defaults.websites = Math.floor(overrideWebsites);
      }
      if (typeof overridePages === 'number' && Number.isFinite(overridePages) && overridePages >= 0 && overridePages <= defaults.pagesPerMonth) {
        defaults.pagesPerMonth = Math.floor(overridePages);
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

export async function checkPagesLimit(
  orgId: string,
  plan: string,
  settings?: string | null
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const limits = getPlanLimits(plan, settings);
  if (limits.pagesPerMonth === -1) {
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
  return { allowed: current < limits.pagesPerMonth, limit: limits.pagesPerMonth, current };
}
