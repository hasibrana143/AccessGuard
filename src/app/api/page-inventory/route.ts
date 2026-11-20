import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';

// GET /api/page-inventory — Get page inventory for a project
export async function GET(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const scanId = searchParams.get('scanId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Verify project belongs to org
  const project = await db.project.findFirst({
    where: { id: projectId, orgId },
    select: { id: true, crawlConfig: true, lastScanAt: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    // Get the latest scan (or specific scan)
    const scanWhere = scanId ? { id: scanId, projectId } : { projectId, status: 'completed' };
    const scanOrder = scanId ? {} : { completedAt: 'desc' as const };

    const latestScan = await db.scan.findFirst({
      where: scanWhere,
      orderBy: scanOrder,
      select: {
        id: true,
        completedAt: true,
        pagesScanned: true,
        violationsFound: true,
        summary: true,
      },
    });

    if (!latestScan) {
      return NextResponse.json({
        projectId,
        crawlConfig: project.crawlConfig ? JSON.parse(project.crawlConfig) : {},
        pages: [],
        summary: { totalPages: 0, scannedPages: 0, pendingPages: 0, coverage: 0 },
        topFixes: [],
        lastScanAt: project.lastScanAt,
      });
    }

    // Get all violations for this scan
    const violations = await db.violation.findMany({
      where: { scanId: latestScan.id, deletedAt: null },
      select: {
        id: true,
        url: true,
        ruleId: true,
        severity: true,
        status: true,
        elementSelector: true,
        wcagCriteria: true,
      },
    });

    // Group violations by URL
    const violationsByUrl = new Map<string, typeof violations>();
    for (const v of violations) {
      const list = violationsByUrl.get(v.url) || [];
      list.push(v);
      violationsByUrl.set(v.url, list);
    }

    // Get crawl config for expected pages
    const crawlConfig = project.crawlConfig ? JSON.parse(project.crawlConfig) : { maxPages: 100 };

    // Build page inventory
    const pages = Array.from(violationsByUrl.entries()).map(([url, urlViolations]) => ({
      url,
      violationsCount: urlViolations.length,
      critical: urlViolations.filter(v => v.severity === 'critical').length,
      serious: urlViolations.filter(v => v.severity === 'serious').length,
      moderate: urlViolations.filter(v => v.severity === 'moderate').length,
      minor: urlViolations.filter(v => v.severity === 'minor').length,
      status: urlViolations.some(v => v.severity === 'critical' || v.severity === 'serious') ? 'needs_attention' : 'ok',
    }));

    // Calculate top fixes (most common ruleIds across project)
    const ruleCounts = new Map<string, { ruleId: string; count: number; severity: string; wcagCriteria: string | null }>();
    for (const v of violations) {
      const existing = ruleCounts.get(v.ruleId) || { ruleId: v.ruleId, count: 0, severity: v.severity, wcagCriteria: v.wcagCriteria };
      existing.count++;
      ruleCounts.set(v.ruleId, existing);
    }

    const topFixes = Array.from(ruleCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(r => ({
        ruleId: r.ruleId,
        count: r.count,
        severity: r.severity,
        wcagCriteria: r.wcagCriteria,
      }));

    const summary = latestScan.summary ? JSON.parse(latestScan.summary) : {};

    return NextResponse.json({
      projectId,
      scanId: latestScan.id,
      scanCompletedAt: latestScan.completedAt,
      crawlConfig,
      pages,
      summary: {
        totalPages: crawlConfig.maxPages || 100,
        scannedPages: latestScan.pagesScanned,
        pendingPages: Math.max(0, (crawlConfig.maxPages || 100) - latestScan.pagesScanned),
        coverage: crawlConfig.maxPages ? Math.round((latestScan.pagesScanned / crawlConfig.maxPages) * 100) : 0,
      },
      topFixes,
      lastScanAt: project.lastScanAt,
    });
  } catch (error) {
    logger.error({ err: error, projectId }, 'Failed to fetch page inventory');
    return NextResponse.json({ error: 'Failed to fetch page inventory' }, { status: 500 });
  }
}