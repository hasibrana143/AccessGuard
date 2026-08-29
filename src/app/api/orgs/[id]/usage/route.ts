import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOrgAccess } from '@/lib/rbac';
import { logger } from '@/lib/error-logger';

// GET /api/orgs/[id]/usage - Get current month usage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireOrgAccess(request, id);
    if (access instanceof NextResponse) return access;

    const org = await db.organization.findUnique({
      where: { id: access.org.id },
      select: {
        id: true,
        name: true,
        plan: true,
        pagesQuota: true,
        pagesUsedThisMonth: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Calculate usage percentage
    const usagePercentage = org.pagesQuota > 0 
      ? Math.min(100, Math.round((org.pagesUsedThisMonth / org.pagesQuota) * 100))
      : 0;

    // Determine if over quota
    const isOverQuota = org.pagesUsedThisMonth >= org.pagesQuota;

    return NextResponse.json({
      success: true,
      data: {
        org: {
          id: org.id,
          name: org.name,
          plan: org.plan,
          subscriptionStatus: org.subscriptionStatus,
        },
        usage: {
          pagesUsed: org.pagesUsedThisMonth,
          pagesQuota: org.pagesQuota,
          usagePercentage,
          isOverQuota,
          remainingPages: Math.max(0, org.pagesQuota - org.pagesUsedThisMonth),
        },
        limits: getPlanLimits(org.plan),
      },
    });
  } catch (error) {
    logger.error({ err: error, orgId: (await params).id }, 'Failed to fetch usage');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}

// POST /api/orgs/[id]/usage/increment - Increment page usage (called after scan)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { pagesScanned = 1 } = body;

    const access = await requireOrgAccess(request, id);
    if (access instanceof NextResponse) return access;

    // Increment usage atomically
    const org = await db.organization.update({
      where: { id: access.org.id },
      data: {
        pagesUsedThisMonth: { increment: pagesScanned },
      },
      select: {
        id: true,
        pagesUsedThisMonth: true,
        pagesQuota: true,
        plan: true,
      },
    });

    const usagePercentage = org.pagesQuota > 0
      ? Math.min(100, Math.round((org.pagesUsedThisMonth / org.pagesQuota) * 100))
      : 0;

    const isOverQuota = org.pagesUsedThisMonth >= org.pagesQuota;

    // Log usage for audit
    await db.auditLog.create({
      data: {
        orgId: org.id,
        action: 'usage_incremented',
        metadata: JSON.stringify({
          pagesScanned,
          newTotal: org.pagesUsedThisMonth,
          quota: org.pagesQuota,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        pagesUsed: org.pagesUsedThisMonth,
        pagesQuota: org.pagesQuota,
        usagePercentage,
        isOverQuota,
        remainingPages: Math.max(0, org.pagesQuota - org.pagesUsedThisMonth),
      },
    });
  } catch (error) {
    logger.error({ err: error, orgId: (await params).id }, 'Failed to increment usage');
    return NextResponse.json(
      { success: false, error: 'Failed to increment usage' },
      { status: 500 }
    );
  }
}

function getPlanLimits(plan: string): { pagesPerMonth: number; websites: number } {
  const limits: Record<string, { pagesPerMonth: number; websites: number }> = {
    free: { pagesPerMonth: 1000, websites: 1 },
    starter: { pagesPerMonth: 50000, websites: 10 },
    growth: { pagesPerMonth: 500000, websites: 50 },
    agency: { pagesPerMonth: 1000000, websites: 200 },
    enterprise: { pagesPerMonth: -1, websites: -1 }, // unlimited
  };
  return limits[plan] || limits.free;
}