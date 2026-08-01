import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOrgAccess, requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';

// GET /api/team/members?orgSlug=... - List team members (own org only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get('orgSlug');

  const access = await requireOrgAccess(request, orgSlug);
  if (access instanceof NextResponse) return access;

  const org = await db.organization.findFirst({
    where: { id: access.org.id },
    include: {
      users: {
        select: { id: true, email: true, name: true, role: true, avatar: true, customRoleId: true, createdAt: true }
      }
    }
  });

  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: org.users });
}

// PATCH /api/team/members - Update member role or custom role (manage_team)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.MANAGE_TEAM);
    if (auth instanceof NextResponse) return auth;

    const { userId, role, customRoleId } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const target = await db.user.findFirst({
      where: { id: userId, orgId: auth.user.orgId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined) {
      if (!['admin', 'owner', 'member'].includes(role)) {
        return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
      }
      if (role === 'owner' && target.role !== 'owner' && auth.user.role !== 'owner') {
        return NextResponse.json({ success: false, error: 'Only an owner can promote to owner' }, { status: 403 });
      }
      data.role = role;
    }
    if (customRoleId !== undefined) {
      if (customRoleId === null) {
        data.customRoleId = null;
      } else {
        const customRole = await db.customRole.findFirst({
          where: { id: customRoleId, orgId: auth.user.orgId },
        });
        if (!customRole) {
          return NextResponse.json({ success: false, error: 'Custom role not found' }, { status: 404 });
        }
        data.customRoleId = customRoleId;
      }
    }

    await db.user.update({
      where: { id: userId },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/team/members - Remove member (admin or owner only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.MANAGE_TEAM);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const target = await db.user.findFirst({
      where: { id: userId, orgId: auth.user.orgId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await db.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to remove member' }, { status: 500 });
  }
}
