import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/violations - List violations with filters
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
    
    if (projectId) where.projectId = projectId;
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
    console.error('Error fetching violations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch violations' },
      { status: 500 }
    );
  }
}

// PUT /api/violations - Update violation status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, fixedAt } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'ID and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['open', 'fixed', 'ignored', 'false_positive'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
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
    console.error('Error updating violation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update violation' },
      { status: 500 }
    );
  }
}

// GET /api/violations/stats - Get violation statistics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, orgSlug = 'default-org' } = body;

    let projectIds: string[] = [];

    if (projectId) {
      projectIds = [projectId];
    } else {
      const org = await db.organization.findFirst({
        where: { slug: orgSlug },
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
        topRules: ruleStats.map(r => ({
          ruleId: r.ruleId,
          count: r._count
        })),
        recent: recentViolations
      }
    });
  } catch (error) {
    console.error('Error fetching violation stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
