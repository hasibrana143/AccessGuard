import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { executeScan } from '@/lib/scan-executor';
import { apiKeyAuth } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';
import { checkPagesLimit } from '@/lib/plan-limits';

// POST /api/v1/scans - Trigger a scan (API key auth)
export async function POST(request: NextRequest) {
  const auth = await apiKeyAuth(request, 'scans:write');
  if (auth.response) return auth.response;
  if (!auth.success || !auth.apiKey) return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });

  const { apiKey } = auth;
  const orgId = apiKey.orgId;

  try {
    const body = await request.json();
    const { projectId, url, html, scanConfig } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Verify project belongs to org
    const project = await db.project.findFirst({
      where: { id: projectId, orgId },
      select: { id: true, orgId: true, url: true, isActive: true, crawlConfig: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.isActive) {
      return NextResponse.json({ error: 'Project is inactive' }, { status: 400 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, settings: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check page quota
    const pageCheck = await checkPagesLimit(orgId, org.plan || 'free', org.settings);
    if (!pageCheck.allowed) {
      return NextResponse.json(
        { error: 'Monthly scan limit reached', current: pageCheck.current, limit: pageCheck.limit },
        { status: 429 }
      );
    }

    // Execute scan
    const result = await executeScan({
      projectId,
      url: url || project.url,
      userId: apiKey.id, // Use API key ID as user identifier
      useBrowser: true,
      html,
      scanConfig,
      enforcePlanLimits: true,
      sendNotifications: false, // API scans don't send notifications by default
    });

    if (!result.success) {
      return NextResponse.json({ error: result.errorMessage }, { status: 400 });
    }

    await createAuditLog({
      orgId,
      userId: apiKey.id,
      action: 'api_scan_triggered',
      metadata: { projectId, scanId: result.scanId, pagesScanned: result.pagesScanned },
    });

    return NextResponse.json({
      success: true,
      scanId: result.scanId,
      violationsFound: result.violationsFound,
      pagesScanned: result.pagesScanned,
      severityCounts: result.severityCounts,
      riskScore: result.riskScore,
    });
  } catch (error) {
    logger.error({ err: error, orgId }, 'API scan failed');
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}