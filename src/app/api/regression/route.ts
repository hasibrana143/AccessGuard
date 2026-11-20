import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';

// GET /api/regression — Get regression summary for a project
export async function GET(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Verify project belongs to org
  const project = await db.project.findFirst({
    where: { id: projectId, orgId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    // Get last 10 completed scans with regression data
    const scans = await db.scan.findMany({
      where: { projectId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        completedAt: true,
        pagesScanned: true,
        violationsFound: true,
        summary: true,
      },
    });

    const regressionData = scans.map((scan) => {
      const summary = scan.summary ? JSON.parse(scan.summary) : {};
      return {
        scanId: scan.id,
        completedAt: scan.completedAt,
        pagesScanned: scan.pagesScanned,
        violationsFound: scan.violationsFound,
        severity: summary.severity || {},
        regression: summary.regression || {},
      };
    });

    // Calculate trends
    const latest = regressionData[0];
    const previous = regressionData[1];

    const trends = latest && previous ? {
      violationsDelta: latest.violationsFound - previous.violationsFound,
      newViolations: latest.regression?.new || 0,
      fixedViolations: latest.regression?.fixed || 0,
      regressedViolations: latest.regression?.regressed || 0,
      persistingViolations: latest.regression?.persisting || 0,
    } : null;

    return NextResponse.json({
      projectId,
      scans: regressionData,
      trends,
    });
  } catch (error) {
    logger.error({ err: error, projectId }, 'Failed to fetch regression data');
    return NextResponse.json({ error: 'Failed to fetch regression data' }, { status: 500 });
  }
}