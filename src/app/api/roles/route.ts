import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { requirePermission } from '@/lib/rbac';
import { PERMISSIONS, ALL_PERMISSIONS, safeParsePermissions, type Permission } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';

// GET /api/roles - List custom roles for the org (+ users assigned)
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`roles-get:${clientId}`, rateLimits.default);
  if (!rateResult.success) return createRateLimitResponse(rateResult);

  try {
    const auth = await requirePermission(request, PERMISSIONS.MANAGE_TEAM);
    if (auth instanceof NextResponse) return auth;

    const roles = await db.customRole.findMany({
      where: { orgId: auth.user.orgId },
      include: {
        users: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: safeParsePermissions(r.permissions),
        members: r.users,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// POST /api/roles - Create a custom role
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`roles-post:${clientId}`, rateLimits.default);
  if (!rateResult.success) return createRateLimitResponse(rateResult);

  try {
    const auth = await requirePermission(request, PERMISSIONS.MANAGE_TEAM);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { name, description, permissions } = body;

    const roleName = typeof name === 'string' ? name.trim() : '';
    if (!roleName || roleName.length > 50) {
      return NextResponse.json({ success: false, error: 'Role name is required (max 50 characters)' }, { status: 400 });
    }
    const validPermissions = Array.isArray(permissions)
      ? permissions.filter((p: unknown): p is Permission => ALL_PERMISSIONS.includes(p as Permission))
      : [];
    if (validPermissions.length === 0) {
      return NextResponse.json({ success: false, error: 'Select at least one permission' }, { status: 400 });
    }

    const existing = await db.customRole.findUnique({
      where: { orgId_name: { orgId: auth.user.orgId, name: roleName } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'A role with this name already exists' }, { status: 409 });
    }

    const role = await db.customRole.create({
      data: {
        orgId: auth.user.orgId,
        name: roleName,
        description: typeof description === 'string' ? description.slice(0, 200) : null,
        permissions: JSON.stringify(validPermissions),
      },
    });

    await db.auditLog.create({
      data: {
        orgId: auth.user.orgId,
        action: 'custom_role_created',
        metadata: JSON.stringify({ roleName, permissions: validPermissions }),
      },
    });

    return NextResponse.json({ success: true, data: { id: role.id, name: role.name } });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to create role' }, { status: 500 });
  }
}

// PATCH /api/roles - Update a role (name, description, permissions)
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`roles-patch:${clientId}`, rateLimits.default);
  if (!rateResult.success) return createRateLimitResponse(rateResult);

  try {
    const auth = await requirePermission(request, PERMISSIONS.MANAGE_TEAM);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { id, name, description, permissions } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Role ID is required' }, { status: 400 });
    }
    const role = await db.customRole.findFirst({ where: { id, orgId: auth.user.orgId } });
    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      const roleName = typeof name === 'string' ? name.trim() : '';
      if (!roleName || roleName.length > 50) {
        return NextResponse.json({ success: false, error: 'Role name is required (max 50 characters)' }, { status: 400 });
      }
      const conflict = await db.customRole.findFirst({
        where: { orgId: auth.user.orgId, name: roleName, id: { not: id } },
      });
      if (conflict) {
        return NextResponse.json({ success: false, error: 'A role with this name already exists' }, { status: 409 });
      }
      data.name = roleName;
    }
    if (description !== undefined) {
      data.description = typeof description === 'string' ? description.slice(0, 200) : null;
    }
    if (permissions !== undefined) {
      const valid = Array.isArray(permissions)
        ? permissions.filter((p: unknown): p is Permission => ALL_PERMISSIONS.includes(p as Permission))
        : [];
      data.permissions = JSON.stringify(valid);
    }

    await db.customRole.update({
      where: { id },
      data,
    });

    await db.auditLog.create({
      data: {
        orgId: auth.user.orgId,
        action: 'custom_role_updated',
        metadata: JSON.stringify({ roleId: id, updatedFields: Object.keys(data) }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/roles - Delete a role (members fall back to base member permissions)
export async function DELETE(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`roles-delete:${clientId}`, rateLimits.default);
  if (!rateResult.success) return createRateLimitResponse(rateResult);

  try {
    const auth = await requirePermission(request, PERMISSIONS.MANAGE_TEAM);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Role ID is required' }, { status: 400 });
    }
    const role = await db.customRole.findFirst({ where: { id, orgId: auth.user.orgId } });
    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    await db.customRole.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        orgId: auth.user.orgId,
        action: 'custom_role_deleted',
        metadata: JSON.stringify({ roleName: role.name }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to delete role' }, { status: 500 });
  }
}
