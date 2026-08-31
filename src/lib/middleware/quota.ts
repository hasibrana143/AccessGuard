import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export interface QuotaCheckResult {
  allowed: boolean;
  pagesUsed: number;
  pagesQuota: number;
  remaining: number;
  overQuota: boolean;
  message?: string;
}

export async function checkUsageQuota(orgId: string): Promise<QuotaCheckResult> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      pagesUsedThisMonth: true,
      pagesQuota: true,
      plan: true,
    },
  });

  if (!org) {
    return {
      allowed: false,
      pagesUsed: 0,
      pagesQuota: 0,
      remaining: 0,
      overQuota: true,
      message: 'Organization not found',
    };
  }

  const pagesUsed = org.pagesUsedThisMonth ?? 0;
  const pagesQuota = org.pagesQuota ?? 1000;
  const remaining = Math.max(0, pagesQuota - pagesUsed);
  const overQuota = pagesUsed >= pagesQuota;

  return {
    allowed: !overQuota,
    pagesUsed,
    pagesQuota,
    remaining,
    overQuota,
    message: overQuota
      ? `Usage quota exceeded. ${pagesUsed}/${pagesQuota} pages used. Upgrade your plan to continue scanning.`
      : undefined,
  };
}

export async function incrementUsage(orgId: string, pageCount: number): Promise<QuotaCheckResult> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { pagesUsedThisMonth: true, pagesQuota: true },
  });

  if (!org) {
    return {
      allowed: false,
      pagesUsed: 0,
      pagesQuota: 0,
      remaining: 0,
      overQuota: true,
      message: 'Organization not found',
    };
  }

  const pagesUsed = (org.pagesUsedThisMonth ?? 0) + pageCount;
  const pagesQuota = org.pagesQuota ?? 1000;
  const remaining = Math.max(0, pagesQuota - pagesUsed);
  const overQuota = pagesUsed >= pagesQuota;

  await prisma.organization.update({
    where: { id: orgId },
    data: { pagesUsedThisMonth: pagesUsed },
  });

  return {
    allowed: !overQuota,
    pagesUsed,
    pagesQuota,
    remaining,
    overQuota,
  };
}

export function quotaExceededResponse(result: QuotaCheckResult): NextResponse {
  return NextResponse.json(
    {
      error: 'QUOTA_EXCEEDED',
      message: result.message,
      usage: {
        pagesUsed: result.pagesUsed,
        pagesQuota: result.pagesQuota,
        remaining: result.remaining,
      },
      upgradeUrl: '/billing',
    },
    { status: 429 }
  );
}
