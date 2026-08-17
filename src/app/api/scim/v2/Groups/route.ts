import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { resolveScimToken } from '@/lib/scim';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';

/**
 * SCIM 2.0 (RFC 7644) — /api/scim/v2/Groups
 * GET: list org groups (supports filter=displayName eq, startIndex, count)
 * POST: create a group
 * Bearer-token protected (per-org token).
 */

const SCHEMA_GROUP = 'urn:ietf:params:scim:schemas:core:2.0:Group';
const SCHEMA_LIST = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

function scimGroup(group: { id: string; displayName: string; members: string; createdAt: Date; updatedAt: Date }) {
  const members = JSON.parse(group.members || '[]') as string[];
  return {
    schemas: [SCHEMA_GROUP],
    id: group.id,
    displayName: group.displayName,
    members: members.map((userId) => ({ value: userId, type: 'User' })),
    meta: {
      resourceType: 'Group',
      created: group.createdAt.toISOString(),
      lastModified: group.updatedAt.toISOString(),
      location: `/api/scim/v2/Groups/${group.id}`,
    },
  };
}

async function authorize(request: NextRequest): Promise<string | Response> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Missing bearer token', schemas: [SCHEMA_GROUP] }, { status: 401 });
  }
  const orgId = await resolveScimToken(authHeader.slice(7));
  if (!orgId) {
    return NextResponse.json({ detail: 'Invalid token', schemas: [SCHEMA_GROUP] }, { status: 401 });
  }
  const rateResult = await checkRateLimit(`scim:${orgId}`, { interval: 60 * 1000, limit: 120 });
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }
  return orgId;
}

function parseFilter(filter: string | null): { displayName?: string } {
  if (!filter) return {};
  const match = /^displayName\s+eq\s+"([^"]+)"$/i.exec(filter);
  if (match) return { displayName: match[1] };
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
    if (filter.displayName) where.displayName = filter.displayName;

    const [groups, total] = await Promise.all([
      db.scimGroup.findMany({
        where,
        orderBy: { displayName: 'asc' },
        skip: startIndex - 1,
        take: count,
      }),
      db.scimGroup.count({ where }),
    ]);

    return NextResponse.json({
      schemas: [SCHEMA_LIST],
      totalResults: total,
      itemsPerPage: count,
      startIndex,
      Resources: groups.map(scimGroup),
    });
  } catch (error) {
    logger.error({ err: error }, 'scim list groups failed');
    return NextResponse.json({ detail: 'Failed to list groups', schemas: [SCHEMA_LIST] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if (typeof auth !== 'string') return auth;
  const orgId = auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      schemas?: unknown;
      displayName?: unknown;
      members?: Array<{ value?: unknown }>;
    } | null;

    if (!body) {
      return NextResponse.json({ detail: 'Invalid request body', schemas: [SCHEMA_GROUP] }, { status: 400 });
    }

    if (typeof body.displayName !== 'string' || !body.displayName.trim()) {
      return NextResponse.json({ detail: 'displayName is required', schemas: [SCHEMA_GROUP] }, { status: 400 });
    }
    const displayName = body.displayName.trim();

    const existing = await db.scimGroup.findUnique({ where: { orgId_displayName: { orgId, displayName } } });
    if (existing) {
      return NextResponse.json({ detail: 'Group already exists', schemas: [SCHEMA_GROUP] }, { status: 409 });
    }

    const memberIds: string[] = [];
    if (Array.isArray(body.members)) {
      for (const m of body.members) {
        if (typeof m.value === 'string') memberIds.push(m.value);
      }
    }

    const group = await db.scimGroup.create({
      data: {
        orgId,
        displayName,
        members: JSON.stringify(memberIds),
      },
    });

    await db.auditLog.create({
      data: {
        orgId,
        action: 'scim.group_created',
        metadata: JSON.stringify({ displayName, memberCount: memberIds.length, timestamp: new Date().toISOString() }),
      },
    });

    return NextResponse.json(scimGroup(group), { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'scim create group failed');
    return NextResponse.json({ detail: 'Failed to create group', schemas: [SCHEMA_GROUP] }, { status: 500 });
  }
}