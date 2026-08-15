import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { resolveScimToken } from '@/lib/scim';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';

/**
 * SCIM 2.0 (RFC 7644) — /api/scim/v2/Users
 * GET: list org users (supports filter=userName eq, startIndex, count)
 * POST: provision a user by email (creates a member account)
 * Bearer-token protected (per-org token).
 */

const SCHEMA_USER = 'urn:ietf:params:scim:schemas:core:2.0:User';
const SCHEMA_LIST = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

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

function parseFilter(filter: string | null): { userName?: string } {
  if (!filter) return {};
  const match = /^userName\s+eq\s+"([^"]+)"$/i.exec(filter);
  if (match) return { userName: match[1] };
  return {};
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if (typeof auth !== 'string') return auth;
  const orgId = auth;

  try {
    const { searchParams } = new URL(request.url);
    const filter = parseFilter(searchParams.get('filter'));
    const startIndex = Math.max(parseInt(searchParams.get('startIndex') || '1', 10) || 1, 1);
    const count = Math.min(Math.max(parseInt(searchParams.get('count') || '100', 10) || 100, 1), 100);

    const where: Record<string, unknown> = { orgId };
    if (filter.userName) where.email = filter.userName;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: { id: true, email: true, name: true, role: true, createdAt: true },
        orderBy: { email: 'asc' },
        skip: startIndex - 1,
        take: count,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      schemas: [SCHEMA_LIST],
      totalResults: total,
      itemsPerPage: count,
      startIndex,
      Resources: users.map(scimUser),
    });
  } catch (error) {
    logger.error({ err: error }, 'scim list users failed');
    return NextResponse.json({ detail: 'Failed to list users', schemas: [SCHEMA_LIST] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (typeof auth !== 'string') return auth;
  const orgId = auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      schemas?: unknown;
      userName?: unknown;
      emails?: Array<{ value?: unknown }>;
      name?: { givenName?: unknown; familyName?: unknown };
      active?: unknown;
    } | null;

    if (!body) {
      return NextResponse.json({ detail: 'Invalid request body', schemas: [SCHEMA_USER] }, { status: 400 });
    }

    const emailRaw = typeof body.userName === 'string' ? body.userName : body.emails?.find((e) => typeof e.value === 'string')?.value;
    if (typeof emailRaw !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ detail: 'userName must be a valid email', schemas: [SCHEMA_USER] }, { status: 400 });
    }
    const email = emailRaw.toLowerCase();

    if (body.active === false) {
      return NextResponse.json({ detail: 'Cannot create an inactive user via SCIM', schemas: [SCHEMA_USER] }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.orgId === orgId) {
        // Idempotent create: return the existing user (RFC 7644 §3.2).
        return NextResponse.json(scimUser({
          id: existing.id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
          createdAt: existing.createdAt,
        }), { status: 200 });
      }
      return NextResponse.json({ detail: 'Email already in use by another organization', schemas: [SCHEMA_USER] }, { status: 409 });
    }

    const givenName = typeof body.name?.givenName === 'string' ? body.name.givenName : '';
    const familyName = typeof body.name?.familyName === 'string' ? body.name.familyName : '';
    const displayName = [givenName, familyName].filter(Boolean).join(' ') || null;

    const user = await db.user.create({
      data: {
        orgId,
        email,
        name: displayName,
        role: 'member',
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    await db.auditLog.create({
      data: {
        orgId,
        action: 'scim.user_created',
        metadata: JSON.stringify({ email, userId: user.id, timestamp: new Date().toISOString() }),
      },
    });

    return NextResponse.json(scimUser(user), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'scim create user failed');
    return NextResponse.json({ detail: 'Failed to create user', schemas: [SCHEMA_USER] }, { status: 500 });
  }
}
