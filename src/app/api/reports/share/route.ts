import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';
import { randomBytes } from 'crypto';
import { requireProjectAccess } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';

// POST /api/reports/share - Create a shareable report
// Body: { projectId, reportType?, expiresInDays? } — share links expire by default
//       (PRD UC7: "attach shareable link with expiry"). Default 30 days, max 365.
export const DEFAULT_SHARE_TTL_DAYS = 30;
export const MAX_SHARE_TTL_DAYS = 365;

// Pure clamp so the expiry rule is unit-testable (docs/product PRD UC7).
export function clampShareTtlDays(expiresInDays: unknown): number {
  return Number.isFinite(expiresInDays)
    ? Math.min(Math.max(Math.trunc(Number(expiresInDays)), 1), MAX_SHARE_TTL_DAYS)
    : DEFAULT_SHARE_TTL_DAYS;
}

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`report-share:${clientId}`, rateLimits.default);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { projectId, reportType = 'wcag', expiresInDays } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const ttlDays = clampShareTtlDays(expiresInDays);

    const access = await requireProjectAccess(request, projectId);
    if (access instanceof NextResponse) return access;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { organization: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Compute report summary from current violations
    const severityStats = await db.violation.groupBy({
      by: ['severity'],
      where: { projectId, status: 'open' },
      _count: true,
    });
    const statusStats = await db.violation.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true,
    });
    const totalViolations = statusStats.reduce((acc, s) => acc + s._count, 0);
    const withFix = await db.violation.count({
      where: { projectId, remediationCode: { not: null } },
    });
    const lastScan = await db.scan.findFirst({
      where: { projectId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      projectName: project.name,
      projectUrl: project.url,
      orgName: project.organization.name,
      generatedAt: new Date().toISOString(),
      severity: {
        critical: severityStats.find(s => s.severity === 'critical')?._count || 0,
        serious: severityStats.find(s => s.severity === 'serious')?._count || 0,
        moderate: severityStats.find(s => s.severity === 'moderate')?._count || 0,
        minor: severityStats.find(s => s.severity === 'minor')?._count || 0,
        total: severityStats.reduce((acc, s) => acc + s._count, 0),
      },
      status: {
        open: statusStats.find(s => s.status === 'open')?._count || 0,
        fixed: statusStats.find(s => s.status === 'fixed')?._count || 0,
        ignored: statusStats.find(s => s.status === 'ignored')?._count || 0,
      },
      totalViolations,
      aiFixRate: totalViolations > 0 ? Math.round((withFix / totalViolations) * 100) : 0,
      lastScanAt: lastScan?.createdAt?.toISOString() || null,
    };

    const shareToken = randomBytes(16).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

    const report = await db.complianceReport.create({
      data: {
        projectId,
        name: `${project.name} - Compliance Snapshot`,
        reportType,
        format: 'web',
        status: 'ready',
        summary: JSON.stringify(summary),
        metadata: JSON.stringify({ shareToken, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString() }),
        generatedAt: now,
      },
    });

    await db.auditLog.create({
      data: {
        orgId: project.orgId,
        action: 'report_generated',
        metadata: JSON.stringify({
          reportId: report.id,
          projectName: project.name,
          reportType,
          shared: true,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        shareToken,
        shareUrl: `/share/${shareToken}`,
        expiresAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to create shareable report' },
      { status: 500 }
    );
  }
}

// GET /api/reports/share - List shareable reports for a project
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

    const access = await requireProjectAccess(request, projectId, { permission: PERMISSIONS.GENERATE_REPORTS });
    if (access instanceof NextResponse) return access;

    const reports = await db.complianceReport.findMany({
      where: { projectId, format: 'web', status: 'ready' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: reports.map((r) => {
        let metadata: Record<string, unknown> = {};
        try {
          metadata = JSON.parse(r.metadata || '{}');
        } catch { /* ignore */ }
        return {
          id: r.id,
          name: r.name,
          reportType: r.reportType,
          createdAt: r.createdAt,
          shareToken: metadata.shareToken as string | undefined,
          expiresAt: metadata.expiresAt as string | undefined,
        };
      }),
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to list shareable reports' },
      { status: 500 }
    );
  }
}
