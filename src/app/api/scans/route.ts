import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scanFromHTML, type ScannerViolation } from '@/services/scanner';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { enqueueScan } from '@/lib/queue';
import { logger } from '@/lib/error-logger';
import { requireAuth, requireVerifiedEmail, requireProjectAccess } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { checkPagesLimit } from '@/lib/plan-limits';
import { validateTargetUrl } from '@/lib/url-validation';

// GET /api/scans - List scans
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`scans-get:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const rawLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

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
    if (status) where.status = status;

    const scans = await db.scan.findMany({
      where,
      include: {
        project: {
          select: {
            name: true,
            url: true
          }
        },
        _count: {
          select: { violations: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: scans
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching scans');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scans' },
      { status: 500 }
    );
  }
}

// POST /api/scans - Create and enqueue a scan
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`scans-post:${clientId}`, rateLimits.scan);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { projectId, html } = body;

    // Handle manual HTML upload (inline, no queue needed)
    if (html) {
      if (typeof html !== 'string' || html.length > 2_000_000) {
        return NextResponse.json(
          { success: false, error: 'HTML payload too large (max 2 MB)' },
          { status: 400 }
        );
      }
      const access = await requireProjectAccess(request, projectId, { permission: PERMISSIONS.RUN_SCANS });
      if (access instanceof NextResponse) return access;

      // Enforce monthly page quota for HTML scans too
      const org = await db.organization.findUnique({
        where: { id: access.user.orgId },
        select: { plan: true, settings: true },
      });
      if (org) {
        const pageCheck = await checkPagesLimit(access.user.orgId, org.plan || 'free', org.settings);
        if (!pageCheck.allowed) {
          return NextResponse.json(
            { success: false, error: `Monthly scan limit reached (${pageCheck.current}/${pageCheck.limit} pages)` },
            { status: 402 }
          );
        }
      }

      return handleHtmlScan(projectId, html);
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const access = await requireProjectAccess(request, projectId, { permission: PERMISSIONS.RUN_SCANS });
    if (access instanceof NextResponse) return access;

    const project = await db.project.findUnique({ where: { id: projectId } });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    try { new URL(project.url); } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid project URL' },
        { status: 400 }
      );
    }

    const urlCheck = await validateTargetUrl(project.url);
    if (!urlCheck.ok) {
      return NextResponse.json(
        { success: false, error: `Project URL is not scannable: ${urlCheck.error}` },
        { status: 400 }
      );
    }

    const scan = await db.scan.create({
      data: { projectId, status: 'queued' },
    });

    await enqueueScan(projectId, project.url, 'system');

    logger.info({ scanId: scan.id, projectId }, 'Scan queued for background processing');

    return NextResponse.json({
      success: true,
      data: {
        scan: {
          id: scan.id,
          status: 'queued',
          violationsFound: 0,
          pagesScanned: 0,
        }
      },
      message: 'Scan queued. Results will be available shortly.'
    });

  } catch (error) {
    logger.error({ err: error }, 'Error creating scan');
    return NextResponse.json(
      { success: false, error: 'Failed to create scan' },
      { status: 500 }
    );
  }
}

async function handleHtmlScan(projectId: string, html: string): Promise<NextResponse> {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }

  const scan = await db.scan.create({ data: { projectId, status: 'running' } });

  try {
    const result = await scanFromHTML(html, project.url);
    
    const violationsToCreate = result.violations.map((v: ScannerViolation) => ({
      scanId: scan.id, projectId,
      ruleId: v.ruleId, wcagCriteria: v.wcagCriteria, severity: v.severity,
      url: v.url, elementSelector: v.elementSelector, elementHtml: v.elementHtml,
      description: v.description, remediationCode: v.remediationCode,
      aiExplanation: v.aiExplanation, aiConfidenceScore: v.aiConfidenceScore,
      status: 'open' as const,
    }));

    if (violationsToCreate.length > 0) {
      for (let i = 0; i < violationsToCreate.length; i += 10) {
        await db.violation.createMany({ data: violationsToCreate.slice(i, i + 10) });
      }
    }

    const severityCounts = {
      critical: result.violations.filter(v => v.severity === 'critical').length,
      serious: result.violations.filter(v => v.severity === 'serious').length,
      moderate: result.violations.filter(v => v.severity === 'moderate').length,
      minor: result.violations.filter(v => v.severity === 'minor').length,
    };

    await db.scan.update({
      where: { id: scan.id },
      data: { status: 'completed', completedAt: new Date(), pagesScanned: 1, violationsFound: result.violations.length, summary: JSON.stringify(severityCounts) },
    });

    return NextResponse.json({
      success: true,
      data: { scan: { id: scan.id, status: 'completed', violationsFound: result.violations.length, pagesScanned: 1, summary: severityCounts } },
      message: `Manual scan completed. Found ${result.violations.length} violations.`,
    });

  } catch (error) {
    await db.scan.update({ where: { id: scan.id }, data: { status: 'failed', errorMessage: 'Manual scan failed', completedAt: new Date() } });
    return NextResponse.json({ success: false, error: 'Manual scan failed' }, { status: 500 });
  }
}

// PATCH /api/scans - Update scan status
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`scans-patch:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'ID and status are required' },
        { status: 400 }
      );
    }

    const ALLOWED_STATUSES = ['pending', 'queued', 'running', 'completed', 'failed'];
    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const auth = await requireVerifiedEmail(request);
    if (auth instanceof NextResponse) return auth;

    const existing = await db.scan.findFirst({
      where: { id, project: { orgId: auth.user.orgId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Scan not found' },
        { status: 404 }
      );
    }

    const scan = await db.scan.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({
      success: true,
      data: scan
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating scan');
    return NextResponse.json(
      { success: false, error: 'Failed to update scan' },
      { status: 500 }
    );
  }
}
