// AccessGuard Reports List API
// List previously generated compliance reports

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireAuth, requireVerifiedEmail, requireProjectAccess } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build where clause
    let where: Record<string, unknown>;
    if (projectId) {
      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) return access;
      where = { projectId };
    } else {
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;
      where = { project: { orgId: auth.user.orgId } };
    }

    // Fetch reports with pagination
    const [reports, total] = await Promise.all([
      db.complianceReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      }),
      db.complianceReport.count({ where }),
    ]);

    // Format response
    const formattedReports = reports.map(report => {
      let metadata = {};
      let dateRange = null;

      try {
        metadata = report.metadata ? JSON.parse(report.metadata) : {};
      } catch {
        metadata = {};
      }

      try {
        dateRange = report.dateRange ? JSON.parse(report.dateRange) : null;
      } catch {
        dateRange = null;
      }

      return {
        id: report.id,
        projectId: report.projectId,
        project: report.project,
        reportType: report.reportType,
        dateRange,
        status: report.status,
        fileUrl: report.fileUrl,
        createdAt: report.createdAt.toISOString(),
        metadata,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedReports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reports',
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a report (must belong to the user's org)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const auth = await requireVerifiedEmail(request);
    if (auth instanceof NextResponse) return auth;

    const existing = await db.complianceReport.findFirst({
      where: { id: reportId, project: { orgId: auth.user.orgId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      );
    }

    // Delete the report
    await db.complianceReport.delete({
      where: { id: reportId },
    });

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete report',
      },
      { status: 500 }
    );
  }
}
