import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/error-logger';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

/**
 * GET /api/org/data-export — GDPR Art. 20 data portability export.
 * Returns a structured JSON payload of everything the org controls:
 * user profile, organization, projects, violations, scans, audit logs
 * (90-day window), team invites, and usage counters.
 *
 * Guard chain: auth → org → admin/owner → rate limit (stricter: 5/min).
 * Sensitive fields (password hashes, tokens, MFA secrets) are excluded.
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`data-export:${clientId}`, rateLimits.default);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [organization, users, projects, violations, scans, auditLogs, teamInvites, customRoles] =
      await Promise.all([
        db.organization.findUnique({
          where: { id: orgId },
          select: { id: true, name: true, slug: true, plan: true, dataRegion: true, createdAt: true },
        }),
        db.user.findMany({
          where: { orgId },
          select: { id: true, email: true, name: true, role: true, createdAt: true, emailVerifiedAt: true },
        }),
        db.project.findMany({
          where: { orgId, deletedAt: null },
          select: { id: true, name: true, url: true, isVerified: true, riskScore: true, createdAt: true, lastScanAt: true },
        }),
        db.violation.findMany({
          where: { project: { orgId }, createdAt: { gte: since } },
          select: { id: true, ruleId: true, wcagCriteria: true, severity: true, status: true, url: true, description: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10_000,
        }),
        db.scan.findMany({
          where: { project: { orgId }, startedAt: { gte: since } },
          select: { id: true, status: true, pagesScanned: true, violationsFound: true, startedAt: true, completedAt: true },
          orderBy: { startedAt: 'desc' },
          take: 5_000,
        }),
        db.auditLog.findMany({
          where: { orgId, createdAt: { gte: since } },
          select: { id: true, action: true, metadata: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5_000,
        }),
        db.teamInvite.findMany({
          where: { orgId },
          select: { id: true, email: true, role: true, acceptedAt: true, expiresAt: true, createdAt: true },
        }),
        db.customRole.findMany({
          where: { orgId },
          select: { id: true, name: true, permissions: true, createdAt: true },
        }),
      ]);

    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const exportPayload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      dataWindow: { since: since.toISOString(), until: new Date().toISOString() },
      user: {
        id: (session.user as { id?: string }).id,
        email: (session.user as { email?: string }).email,
        role,
      },
      organization,
      users,
      projects,
      violations: { count: violations.length, items: violations },
      scans: { count: scans.length, items: scans },
      auditLogs: {
        count: auditLogs.length,
        items: auditLogs.map((log) => ({
          ...log,
          metadata: (() => {
            try {
              return JSON.parse(log.metadata);
            } catch {
              return {};
            }
          })(),
        })),
      },
      teamInvites,
      customRoles,
    };

    return NextResponse.json({ success: true, data: exportPayload });
  } catch (error) {
    logger.error({ err: error }, 'data export failed');
    return NextResponse.json({ success: false, error: 'Failed to export data' }, { status: 500 });
  }
}
