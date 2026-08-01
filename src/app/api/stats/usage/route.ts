import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireOrgAccess } from '@/lib/rbac';

// GET /api/stats/usage?orgId=... - Real usage metrics for the organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgParam = searchParams.get('orgId');

    const access = await requireOrgAccess(request, orgParam);
    if (access instanceof NextResponse) return access;

    const org = await db.organization.findUnique({
      where: { id: access.org.id },
      select: {
        id: true,
        plan: true,
        subscriptionStatus: true,
        projects: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const projectIds = org.projects.map((p) => p.id);

    const period = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const [scans, pagesScannedAgg] = await Promise.all([
      db.scan.count({
        where: {
          projectId: { in: projectIds },
          createdAt: { gte: startDate },
        },
      }),
      db.scan.aggregate({
        where: {
          projectId: { in: projectIds },
          createdAt: { gte: startDate },
        },
        _sum: { pagesScanned: true },
      }),
    ]);

    const usage = {
      websitesUsed: projectIds.length,
      pagesScanned: pagesScannedAgg._sum.pagesScanned || 0,
      scansRun: scans,
      period,
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
    };

    return NextResponse.json({ success: true, data: usage });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
