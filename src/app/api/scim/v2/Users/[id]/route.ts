import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { resolveScimToken } from '@/lib/scim';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';

/**
 * SCIM 2.0 (RFC 7644) — /api/scim/v2/Users/:id
 * GET: fetch one user · PATCH: update (active:false deprovisions) · DELETE: deprovision.
 * Bearer-token protected (per-org token).
 */

const SCHEMA_USER = 'urn:ietf:params:scim:schemas:core:2.0:User';

function scimUser(user: { id: string; email: string; name: string | null; role: string; createdAt: Date }) {
  return {
    schemas: [SCHEMA_USER],
    id: user.id,
    userName: user.email,
    name: {
      givenName: user.name?.split(' ')[0] || user.name || '',
      familyName: user.name?.split(' ').slice(1).join(' ') || '',
    },
    active: true,
    emails: [{ value: user.email, primary: true }],
    roles: [user.role],
    meta: {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: user.createdAt.toISOString(),
      location: `/api/scim/v2/Users/${user.id}`,
    },
  };
}

async function authorize(request: NextRequest): Promise<string | NextResponse | Response> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Missing bearer token', schemas: [SCHEMA_USER] }, { status: 401 });
  }
  const orgId = await resolveScimToken(authHeader.slice(7));
  if (!orgId) {
    return NextResponse.json({ detail: 'Invalid token', schemas: [SCHEMA_USER] }, { status: 401 });
  }
  const rateResult = await checkRateLimit(`scim:${orgId}`, { interval: 60 * 1000, limit: 120 });
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }
  return orgId;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (typeof auth !== 'string') return auth;
  const orgId = auth;

  try {
    const { id } = await params;
    const user = await db.user.findFirst({
      where: { id, orgId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      return NextResponse.json({ detail: `User ${id} not found`, schemas: [SCHEMA_USER] }, { status: 404 });
    }
    return NextResponse.json(scimUser(user));
  } catch (error) {
    logger.error({ err: error }, 'scim get user failed');
    return NextResponse.json({ detail: 'Failed to fetch user', schemas: [SCHEMA_USER] }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (typeof auth !== 'string') return auth;
  const orgId = auth;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { active?: unknown; name?: { givenName?: unknown; familyName?: unknown } } | null;
    if (!body) {
      return NextResponse.json({ detail: 'Invalid request body', schemas: [SCHEMA_USER] }, { status: 400 });
    }

    const user = await db.user.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ detail: `User ${id} not found`, schemas: [SCHEMA_USER] }, { status: 404 });
    }

    // active:false = deprovision (remove from org). No other PATCH operations supported.
    if (body.active === false) {
      const target = await db.user.delete({ where: { id }, select: { email: true } });
      await db.auditLog.create({
        data: {
          orgId,
          action: 'scim.user_deactivated',
          metadata: JSON.stringify({ email: target.email, userId: id, timestamp: new Date().toISOString() }),
        },
      });
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ detail: 'Only active=false (deprovision) is supported', schemas: [SCHEMA_USER] }, { status: 400 });
  } catch (error) {
    logger.error({ err: error }, 'scim patch user failed');
    return NextResponse.json({ detail: 'Failed to update user', schemas: [SCHEMA_USER] }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request);
  if (typeof auth !== 'string') return auth;
  const orgId = auth;

  try {
    const { id } = await params;
    const user = await db.user.findFirst({ where: { id, orgId }, select: { id: true, email: true } });
    if (!user) {
      return NextResponse.json({ detail: `User ${id} not found`, schemas: [SCHEMA_USER] }, { status: 404 });
    }

    await db.user.delete({ where: { id } });
    await db.auditLog.create({
      data: {
        orgId,
        action: 'scim.user_deactivated',
        metadata: JSON.stringify({ email: user.email, userId: id, timestamp: new Date().toISOString() }),
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error({ err: error }, 'scim delete user failed');
    return NextResponse.json({ detail: 'Failed to deprovision user', schemas: [SCHEMA_USER] }, { status: 500 });
  }
}
