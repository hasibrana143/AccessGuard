import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireOrgAccess, requireProjectAccess } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { enqueueScan } from '@/lib/queue';
import { validateTargetUrl } from '@/lib/url-validation';

// GET /api/projects - List all projects for the authenticated user's org
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgParam = searchParams.get('orgId');

    const access = await requireOrgAccess(request, orgParam);
    if (access instanceof NextResponse) return access;

    const org = await db.organization.findFirst({
      where: { id: access.org.id }
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const projects = await db.project.findMany({
      where: {
        orgId: org.id,
        isActive: true
      },
      include: {
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate violation summary for each project — one grouped query for the
    // whole org instead of a groupBy per project (was N+1 at scale)
    const openByProject = await db.violation.groupBy({
      by: ['projectId', 'severity'],
      where: {
        projectId: { in: projects.map((p) => p.id) },
        status: 'open',
      },
      _count: true,
    });

    const summaryByProject = new Map<string, { critical: number; serious: number; moderate: number; minor: number; total: number }>();
    for (const row of openByProject) {
      const entry = summaryByProject.get(row.projectId) ?? { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 };
      if (row.severity === 'critical' || row.severity === 'serious' || row.severity === 'moderate' || row.severity === 'minor') {
        entry[row.severity] = row._count;
        entry.total += row._count;
      }
      summaryByProject.set(row.projectId, entry);
    }

    const projectsWithSummary = projects.map((project) => {
      const summary = summaryByProject.get(project.id) ?? { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 };
      const violationSummary = {
        critical: summary.critical,
        serious: summary.serious,
        moderate: summary.moderate,
        minor: summary.minor,
      };

      // Calculate risk score based on violations
      let riskScore = 100;
      riskScore -= violationSummary.critical * 10;
      riskScore -= violationSummary.serious * 5;
      riskScore -= violationSummary.moderate * 2;
      riskScore -= violationSummary.minor * 1;
      riskScore = Math.max(0, Math.min(100, riskScore));

      return {
        ...project,
        violations: violationSummary,
        totalViolations: summary.total,
        riskScore: project.riskScore ?? riskScore,
        isVerified: project.isVerified,
        scanConfig: project.scanConfig
      };
    });

    return NextResponse.json({
      success: true,
      data: projectsWithSummary
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project in the authenticated user's org
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, description, crawlConfig, orgSlug } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    const urlCheck = await validateTargetUrl(url);
    if (!urlCheck.ok) {
      return NextResponse.json(
        { success: false, error: `Invalid URL: ${urlCheck.error}` },
        { status: 400 }
      );
    }

    const access = await requireOrgAccess(request, orgSlug, { permission: PERMISSIONS.CREATE_PROJECTS });
    if (access instanceof NextResponse) return access;
    const org = access.org;

    // Enforce plan website limit
    const { checkWebsiteLimit } = await import('@/lib/plan-limits');
    const limitCheck = await checkWebsiteLimit(org.id, org.plan || 'free', org.settings);
    if (!limitCheck.allowed) {
      await db.auditLog.create({
        data: {
          orgId: org.id,
          action: 'plan_limit_reached',
          metadata: JSON.stringify({
            resource: 'websites',
            limit: limitCheck.limit,
            current: limitCheck.current,
            projectName: name,
          }),
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: `Plan limit reached: your ${org.plan} plan allows ${limitCheck.limit} website(s). Upgrade your plan to add more.`,
          data: { limitCheck },
        },
        { status: 402 }
      );
    }

    // Create project
    const project = await db.project.create({
      data: {
        name,
        url: urlCheck.url || url,
        description: description || null,
        crawlConfig: JSON.stringify(crawlConfig || {
          maxPages: 100,
          excludePaths: [],
          includeSubdomains: false
        }),
        orgId: org.id
      }
    });

    // Create initial scan
    const scan = await db.scan.create({
      data: {
        projectId: project.id,
        status: 'pending'
      }
    });

    // Enqueue the scan job for the worker to process
    await enqueueScan(project.id, project.url, access.user.id);

    return NextResponse.json({
      success: true,
      data: {
        project,
        scan
      }
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Delete a project (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const access = await requireProjectAccess(request, id, { permission: PERMISSIONS.DELETE_PROJECTS });
    if (access instanceof NextResponse) return access;

    await db.project.update({
      where: { id: access.project.id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects - Update project settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, scanConfig, crawlConfig, name, description, url } = body;

    const access = await requireProjectAccess(request, id, { permission: PERMISSIONS.CREATE_PROJECTS });
    if (access instanceof NextResponse) return access;

    const updateData: Record<string, unknown> = {};
    
    if (scanConfig !== undefined) {
      updateData.scanConfig = scanConfig;
    }
    if (crawlConfig !== undefined) {
      updateData.crawlConfig = crawlConfig;
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (url !== undefined) {
      if (typeof url !== 'string') {
        return NextResponse.json(
          { success: false, error: 'URL must be a string' },
          { status: 400 }
        );
      }
      const urlCheck = await validateTargetUrl(url);
      if (!urlCheck.ok) {
        return NextResponse.json(
          { success: false, error: `Invalid URL: ${urlCheck.error}` },
          { status: 400 }
        );
      }
      updateData.url = urlCheck.url || url;
    }

    const project = await db.project.update({
      where: { id: access.project.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    );
  }
}
