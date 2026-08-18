import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { resolveScimToken } from '@/lib/scim';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';

/**
 * SCIM 2.0 (RFC 7644) — /api/scim/v2/Groups/{id}
 * GET: retrieve a group
 * PUT: replace a group (full update)
 * PATCH: update a group (partial - not fully implemented, returns 501)
 * DELETE: delete a group (deprovisions all members)
 * Bearer-token protected (per-org token).
 */

const SCHEMA_GROUP = 'urn:ietf:params:scim:schemas:core:2.0:Group';

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

async function authorize(request: NextRequest): Promise<{ orgId: string; groupId: string } | Response> {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Missing bearer token', schemas: [SCHEMA_GROUP] }, { status: 401 });
  }
  const orgId = await resolveScimToken(authHeader.slice(7));
  if (!orgId) {
    return NextResponse.json({ detail: 'Invalid token', schemas: [SCHEMA_GROUP] }, { status: 401 });
  }

  const groupId = request.nextUrl.pathname.split('/').pop() || '';
  if (!groupId) {
    return NextResponse.json({ detail: 'Group ID required', schemas: [SCHEMA_GROUP] }, { status: 400 });
  }

  const rateResult = await checkRateLimit(`scim:${orgId}`, { interval: 60 * 1000, limit: 120 });
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  // Verify group belongs to org
  const group = await db.scimGroup.findFirst({ where: { id: groupId, orgId } });
  if (!group) {
    return NextResponse.json({ detail: 'Group not found', schemas: [SCHEMA_GROUP] }, { status: 404 });
  }

  return { orgId, groupId };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if ('orgId' in auth === false) return auth;

  try {
    const group = await db.scimGroup.findUnique({ where: { id: auth.groupId } });
    if (!group) {
      return NextResponse.json({ detail: 'Group not found', schemas: [SCHEMA_GROUP] }, { status: 404 });
    }
    return NextResponse.json(scimGroup(group));
  } catch (error) {
    logger.error({ err: error }, 'scim get group failed');
    return NextResponse.json({ detail: 'Failed to retrieve group', schemas: [SCHEMA_GROUP] }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorize(request);
  if ('orgId' in auth === false) return auth;
  const { orgId, groupId } = auth;

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

    // Check for duplicate displayName in same org (excluding current group)
    const duplicate = await db.scimGroup.findFirst({
      where: { orgId, displayName, NOT: { id: groupId } },
    });
    if (duplicate) {
      return NextResponse.json({ detail: 'Group with this displayName already exists', schemas: [SCHEMA_GROUP] }, { status: 409 });
    }

    const memberIds: string[] = [];
    if (Array.isArray(body.members)) {
      for (const m of body.members) {
        if (typeof m.value === 'string') memberIds.push(m.value);
      }
    }

    const group = await db.scimGroup.update({
      where: { id: groupId },
      data: {
        displayName,
        members: JSON.stringify(memberIds),
      },
    });

    await db.auditLog.create({
      data: {
        orgId,
        action: 'scim_group_updated',
        metadata: JSON.stringify({ groupId, displayName, memberCount: memberIds.length, timestamp: new Date().toISOString() }),
      },
    });

    return NextResponse.json(scimGroup(group));
  } catch (error) {
    logger.error({ err: error }, 'scim update group failed');
    return NextResponse.json({ detail: 'Failed to update group', schemas: [SCHEMA_GROUP] }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // SCIM PATCH is complex (Operations array); return 501 for now
  return NextResponse.json({ detail: 'PATCH not implemented', schemas: [SCHEMA_GROUP] }, { status: 501 });
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize(request);
  if ('orgId' in auth === false) return auth;
  const { orgId, groupId } = auth;

  try {
    await db.scimGroup.delete({ where: { id: groupId } });

    await db.auditLog.create({
      data: {
        orgId,
        action: 'scim_group_deleted',
        metadata: JSON.stringify({ groupId, timestamp: new Date().toISOString() }),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error({ err: error }, 'scim delete group failed');
    return NextResponse.json({ detail: 'Failed to delete group', schemas: [SCHEMA_GROUP] }, { status: 500 });
  }
}