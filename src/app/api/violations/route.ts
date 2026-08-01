import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireAuth, requireOrgAccess, requireProjectAccess } from '@/lib/rbac';

// GET /api/violations - List violations with filters (scoped to the user's org)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const ruleId = searchParams.get('ruleId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};

    if (projectId) {
      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) return access;
      where.projectId = projectId;
    } else {
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;
      where.project = { orgId: auth.user.orgId };
    }

    if (severity && severity !== 'all') where.severity = severity;
    if (status && status !== 'all') where.status = status;
    if (ruleId) where.ruleId = ruleId;

    const [violations, total] = await Promise.all([
      db.violation.findMany({
        where,
        include: {
          project: {
            select: {
              name: true,
              url: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      db.violation.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: violations,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch violations' },
      { status: 500 }
    );
  }
}

// PUT /api/violations - Update violation status (scoped to the user's org)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, fixedAt } = body;

    const validStatuses = ['open', 'fixed', 'ignored', 'false_positive'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'ID and status are required' },
        { status: 400 }
      );
    }

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const existing = await db.violation.findFirst({
      where: { id, project: { orgId: auth.user.orgId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Violation not found' },
        { status: 404 }
      );
    }

    const violation = await db.violation.update({
      where: { id },
      data: {
        status,
        fixedAt: status === 'fixed' ? (fixedAt ? new Date(fixedAt) : new Date()) : null
      }
    });

    return NextResponse.json({
      success: true,
      data: violation
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to update violation' },
      { status: 500 }
    );
  }
}

// POST /api/violations - Get violation statistics (scoped to the user's org)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, orgSlug = 'default-org' } = body;

    let projectIds: string[] = [];

    if (projectId) {
      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) return access;
      projectIds = [projectId];
    } else {
      const access = await requireOrgAccess(request, orgSlug);
      if (access instanceof NextResponse) return access;
      const org = await db.organization.findFirst({
        where: { id: access.org.id },
        include: {
          projects: {
            where: { isActive: true },
            select: { id: true }
          }
        }
      });

      if (!org) {
        return NextResponse.json(
          { success: false, error: 'Organization not found' },
          { status: 404 }
        );
      }

      projectIds = org.projects.map(p => p.id);
    }

    // Get severity distribution
    const severityStats = await db.violation.groupBy({
      by: ['severity'],
      where: {
        projectId: { in: projectIds },
        status: 'open'
      },
      _count: true
    });

    // Get status distribution
    const statusStats = await db.violation.groupBy({
      by: ['status'],
      where: {
        projectId: { in: projectIds }
      },
      _count: true
    });

    // AI fix rate: violations with remediation code vs total
    const totalViolations = statusStats.reduce((acc, curr) => acc + curr._count, 0);
    const violationsWithFix = await db.violation.count({
      where: {
        projectId: { in: projectIds },
        remediationCode: { not: null }
      }
    });

    // Get rule distribution (top 10)
    const ruleStats = await db.violation.groupBy({
      by: ['ruleId'],
      where: {
        projectId: { in: projectIds },
        status: 'open'
      },
      _count: true,
      orderBy: {
        _count: { ruleId: 'desc' }
      },
      take: 10
    });

    // Get recent violations
    const recentViolations = await db.violation.findMany({
      where: {
        projectId: { in: projectIds },
        status: 'open'
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        project: {
          select: { name: true }
        }
      }
    });

    const totalOpen = severityStats.reduce((acc, curr) => acc + curr._count, 0);

    return NextResponse.json({
      success: true,
      data: {
        severity: {
          critical: severityStats.find(s => s.severity === 'critical')?._count || 0,
          serious: severityStats.find(s => s.severity === 'serious')?._count || 0,
          moderate: severityStats.find(s => s.severity === 'moderate')?._count || 0,
          minor: severityStats.find(s => s.severity === 'minor')?._count || 0,
          total: totalOpen
        },
        status: {
          open: statusStats.find(s => s.status === 'open')?._count || 0,
          fixed: statusStats.find(s => s.status === 'fixed')?._count || 0,
          ignored: statusStats.find(s => s.status === 'ignored')?._count || 0,
          falsePositive: statusStats.find(s => s.status === 'false_positive')?._count || 0
        },
        fixRate: {
          withFix: violationsWithFix,
          total: totalViolations,
          percentage: totalViolations > 0 ? Math.round((violationsWithFix / totalViolations) * 100) : 0
        },
        topRules: ruleStats.map(r => ({
          ruleId: r.ruleId,
          count: r._count
        })),
        recent: recentViolations
      }
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
