import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/error-logger';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

function isAdmin(user: { role?: string | null } | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'owner';
}

// GET /api/admin - Admin panel data (users, orgs, system health, usage)
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`admin-get:${clientId}`, rateLimits.default);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin(session.user as { role?: string })) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = (session.user as { orgId?: string }).orgId;

    const [users, orgs, projects, scans, violations, auditLogs] = await Promise.all([
      db.user.findMany({
        where: { orgId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true,
          mfaEnabledAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.organization.findMany({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: { select: { users: true, projects: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.project.count({ where: { orgId, isActive: true } }),
      db.scan.count({ where: { project: { orgId } } }),
      db.violation.count({ where: { project: { orgId } } }),
      db.auditLog.count({ where: { orgId } }),
    ]);

    const recentScans = await db.scan.findMany({
      where: { project: { orgId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        pagesScanned: true,
        violationsFound: true,
        createdAt: true,
        project: { select: { name: true } },
      },
    });

    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const scansThisWeek = await db.scan.count({
      where: { project: { orgId }, createdAt: { gte: lastWeek } },
    });

    const health = {
      database: 'ok',
      redis: process.env.REDIS_URL ? 'ok' : 'not-configured',
      api: 'ok',
      worker: process.env.REDIS_URL ? 'ok' : 'standby',
    };

    const { getAllFlagDefinitions, isEnabled } = await import('@/lib/feature-flags');
    const flags: Record<string, boolean> = {};
    for (const flag of getAllFlagDefinitions()) {
      flags[flag.key] = await isEnabled(flag.key, orgId);
    }

    return NextResponse.json({
      success: true,
      data: {
        users,
        orgs,
        usage: {
          projects,
          scans,
          violations,
          auditLogs,
          scansThisWeek,
        },
        health,
        recentScans,
        flags,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to load admin data' }, { status: 500 });
  }
}

// PATCH /api/admin - Toggle feature flags / update roles
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`admin-patch:${clientId}`, rateLimits.default);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdmin(session.user as { role?: string })) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'set-role') {
      const { userId, role } = body;
      if (!userId || !['admin', 'member', 'viewer'].includes(role)) {
        return NextResponse.json({ success: false, error: 'Invalid role update' }, { status: 400 });
      }
      const target = await db.user.findUnique({ where: { id: userId } });
      if (!target) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      if (target.orgId !== (session.user as { orgId?: string }).orgId) {
        return NextResponse.json({ success: false, error: 'User is in another organization' }, { status: 403 });
      }
      const updated = await db.user.update({
        where: { id: userId },
        data: { role },
      });
      return NextResponse.json({ success: true, data: { id: updated.id, role: updated.role } });
    }

    if (action === 'set-flag') {
      const orgId = (session.user as { orgId?: string }).orgId;
      const { flag, enabled } = body;
      if (!orgId || !flag) {
        return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
      }
      const { getFlagDefinition, setFlag } = await import('@/lib/feature-flags');
      if (!getFlagDefinition(flag)) {
        return NextResponse.json({ success: false, error: `Unknown flag: ${flag}` }, { status: 400 });
      }
      await setFlag(flag, !!enabled, orgId);
      return NextResponse.json({ success: true, data: { flag, enabled: !!enabled } });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to update admin data' }, { status: 500 });
  }
}
