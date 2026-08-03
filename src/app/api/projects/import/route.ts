import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { requireOrgAccess } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { enqueueScan } from '@/lib/queue';
import { validateTargetUrl } from '@/lib/url-validation';

// POST /api/projects/import - Bulk import projects from CSV
// CSV format: name,url,description,scanFrequency (scanFrequency optional: none|daily|weekly|monthly)
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`projects-import:${clientId}`, rateLimits.default);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { projects, orgSlug } = body;

    if (!orgSlug) {
      return NextResponse.json(
        { success: false, error: 'Organization is required' },
        { status: 400 }
      );
    }

    const access = await requireOrgAccess(request, orgSlug, { permission: PERMISSIONS.CREATE_PROJECTS });
    if (access instanceof NextResponse) return access;
    const org = access.org;

    if (!Array.isArray(projects) || projects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one project is required' },
        { status: 400 }
      );
    }

    if (projects.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Maximum 100 projects per import' },
        { status: 400 }
      );
    }

    // Enforce plan website limit (count against currently existing projects)
    const { checkWebsiteLimit } = await import('@/lib/plan-limits');
    const limitCheck = await checkWebsiteLimit(org.id, org.plan || 'free', org.settings);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Plan limit reached: your ${org.plan} plan allows ${limitCheck.limit} website(s). Upgrade your plan to add more.`,
          data: { limitCheck },
        },
        { status: 402 }
      );
    }
    const slotsRemaining = limitCheck.limit === Infinity ? projects.length : Math.max(0, limitCheck.limit - limitCheck.current);

    const created: Array<{ name: string; url: string; scanFrequency?: string }> = [];
    const failed: Array<{ name?: string; url?: string; error: string }> = [];
    const skipped: Array<{ url: string; error: string }> = [];
    let limitReached = false;

    const existing = await db.project.findMany({
      where: { orgId: org.id, isActive: true },
      select: { url: true },
    });
    const existingUrls = new Set(existing.map(p => p.url.replace(/\/$/, '')));

    for (const raw of projects) {
      if (created.length >= slotsRemaining) {
        limitReached = true;
        break;
      }

      const name = typeof raw.name === 'string' ? raw.name.trim() : '';
      const url = typeof raw.url === 'string' ? raw.url.trim() : '';
      const description = typeof raw.description === 'string' ? raw.description.trim() : '';
      const scanFrequency = typeof raw.scanFrequency === 'string' ? raw.scanFrequency.trim() : 'none';

      if (!name || !url) {
        failed.push({ name, url, error: 'Name and URL are required' });
        continue;
      }

      const urlCheck = await validateTargetUrl(url);
      if (!urlCheck.ok) {
        failed.push({ name, url, error: `Invalid URL: ${urlCheck.error}` });
        continue;
      }
      const safeUrl = urlCheck.url || url;

      const normalizedUrl = safeUrl.replace(/\/$/, '');
      if (existingUrls.has(normalizedUrl)) {
        skipped.push({ url, error: 'Duplicate URL (already exists)' });
        continue;
      }

      try {
        const project = await db.project.create({
          data: {
            name,
            url: safeUrl,
            description: description || null,
            crawlConfig: JSON.stringify({ maxPages: 100, excludePaths: [], includeSubdomains: false }),
            orgId: org.id,
          },
        });
        existingUrls.add(normalizedUrl);

        await db.scan.create({
          data: { projectId: project.id, status: 'pending' },
        });

        await enqueueScan(project.id, safeUrl, 'system');

        if (['daily', 'weekly', 'monthly'].includes(scanFrequency)) {
          const now = new Date();
          const nextScan = new Date(
            now.getTime() + (scanFrequency === 'daily' ? 24 : scanFrequency === 'weekly' ? 7 * 24 : 30 * 24) * 60 * 60 * 1000
          );
          await db.project.update({
            where: { id: project.id },
            data: { nextScheduledScan: nextScan },
          });
        }

        created.push({ name, url, scanFrequency });
      } catch (error) {
        failed.push({ name, url, error: error instanceof Error ? error.message : 'Database error' });
      }
    }

    if (created.length > 0) {
      await db.auditLog.create({
        data: {
          orgId: org.id,
          action: 'project.created',
          metadata: JSON.stringify({
            bulkImport: true,
            count: created.length,
            projectNames: created.map(p => p.name),
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        failed,
        skipped,
        totalCreated: created.length,
        totalFailed: failed.length,
        totalSkipped: skipped.length,
        limitReached,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to import projects' },
      { status: 500 }
    );
  }
}
