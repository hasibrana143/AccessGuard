import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireOrgAccess, requireRole } from '@/lib/rbac';

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
        select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true }
      }
    }
  });

  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: org.users });
}

// PATCH /api/team/members - Update member role (admin or owner only)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'owner']);
    if (auth instanceof NextResponse) return auth;

    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: 'User ID and role are required' }, { status: 400 });
    }

    const target = await db.user.findFirst({
      where: { id: userId, orgId: auth.user.orgId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await db.user.update({
      where: { id: userId },
      data: { role }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/team/members - Remove member (admin or owner only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'owner']);
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
