import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireProjectAccess } from '@/lib/rbac';

// GET /api/stats/regression?projectId=... - Compare latest two scans to detect regressions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const access = await requireProjectAccess(request, projectId);
    if (access instanceof NextResponse) return access;

    const scans = await db.scan.findMany({
      where: { projectId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 2,
      select: { id: true, createdAt: true, violationsFound: true },
    });

    if (scans.length < 2) {
      return NextResponse.json({
        success: true,
        data: {
          hasComparison: false,
          message: scans.length === 0 ? 'No completed scans yet' : 'Run another scan to compare',
          newViolations: [],
          resolvedViolations: [],
          regressions: 0,
          resolved: 0,
        },
      });
    }

    const [latestScan, previousScan] = scans;

    const [latestViolations, previousViolations] = await Promise.all([
      db.violation.findMany({
        where: { scanId: latestScan.id },
        select: { ruleId: true, url: true, severity: true, description: true },
      }),
      db.violation.findMany({
        where: { scanId: previousScan.id },
        select: { ruleId: true, url: true, severity: true, description: true },
      }),
    ]);

    const key = (v: { ruleId: string; url: string }) => `${v.ruleId}::${v.url}`;
    const previousKeys = new Set(previousViolations.map(key));
    const latestKeys = new Set(latestViolations.map(key));

    const newViolations = latestViolations.filter((v) => !previousKeys.has(key(v)));
    const resolvedViolations = previousViolations.filter((v) => !latestKeys.has(key(v)));

    return NextResponse.json({
      success: true,
      data: {
        hasComparison: true,
        previousScan: { id: previousScan.id, createdAt: previousScan.createdAt, violationsFound: previousScan.violationsFound },
        latestScan: { id: latestScan.id, createdAt: latestScan.createdAt, violationsFound: latestScan.violationsFound },
        newViolations: newViolations.slice(0, 25),
        resolvedViolations: resolvedViolations.slice(0, 25),
        regressions: newViolations.length,
        resolved: resolvedViolations.length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to detect regressions' },
      { status: 500 }
    );
  }
}
