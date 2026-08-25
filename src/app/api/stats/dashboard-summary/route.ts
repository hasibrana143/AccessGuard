import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireAuth } from '@/lib/rbac';
import { checkRateLimit, getClientIdentifier, rateLimits } from '@/lib/rate-limit';
import { getRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stats/dashboard-summary
 * Returns aggregated dashboard stats: active scans, violation counts by severity,
 * project count, recent scan activity, and uptime — all in one round-trip.
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const requestId = getRequestId(request);

  const rateResult = await checkRateLimit(`stats-dashboard:${clientId}`, rateLimits.default);
  if (!rateResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rateResult.limit),
          'X-RateLimit-Remaining': String(rateResult.remaining),
          'X-RateLimit-Reset': String(rateResult.reset),
          'X-Request-ID': requestId,
        },
      }
    );
  }

  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const orgId = auth.user.orgId;

    // Run all queries in parallel
    const [projectCount, activeScanCount, violationsBySeverity, recentScans, fixedCount, totalCount] = await Promise.all([
      db.project.count({ where: { orgId, isActive: true } }),

      db.scan.count({
        where: {
          project: { orgId },
          status: { in: ['running', 'queued', 'pending'] },
        },
      }),

      db.violation.groupBy({
        by: ['severity'],
        where: {
          project: { orgId },
          status: 'open',
        },
        _count: { severity: true },
      }),

      db.scan.findMany({
        where: { project: { orgId } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          violationsFound: true,
          pagesScanned: true,
          createdAt: true,
          completedAt: true,
          project: { select: { name: true } },
        },
      }),

      db.violation.count({
        where: {
          project: { orgId },
          status: 'fixed',
        },
      }),

      db.violation.count({
        where: {
          project: { orgId },
          status: 'open',
        },
      }),
    ]);

    // Transform severity counts
    const severityMap: Record<string, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const row of violationsBySeverity) {
      severityMap[row.severity] = row._count.severity;
    }

    const totalOpen = Object.values(severityMap).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      data: {
        projects: projectCount,
        activeScans: activeScanCount,
        violations: {
          open: totalOpen,
          fixed: fixedCount,
          ...severityMap,
        },
        fixRate: totalCount > 0 ? Math.round((fixedCount / (fixedCount + totalCount)) * 100) : 0,
        recentScans: recentScans.map((s) => ({
          id: s.id,
          status: s.status,
          violationsFound: s.violationsFound,
          pagesScanned: s.pagesScanned,
          projectName: s.project?.name || 'Unknown',
          createdAt: s.createdAt,
          completedAt: s.completedAt,
        })),
        generatedAt: new Date().toISOString(),
      },
    }, {
      headers: {
        'X-Request-ID': requestId,
        'X-RateLimit-Remaining': String(rateResult.remaining),
      },
    });
  } catch (error) {
    logger.error({ err: error, requestId }, 'dashboard-summary error');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard summary' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}
