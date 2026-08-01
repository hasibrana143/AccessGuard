import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateInviteToken, getInviteExpiry, type Role } from '@/lib/team';
import { sendTeamInviteEmail, isEmailConfigured } from '@/lib/email';
import { requireOrgAccess, requireRole } from '@/lib/rbac';

// GET /api/team/invite?orgSlug=... - List pending invites (own org only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgSlug = searchParams.get('orgSlug');

  const access = await requireOrgAccess(request, orgSlug);
  if (access instanceof NextResponse) return access;

  const invites = await db.teamInvite.findMany({
    where: { orgId: access.org.id, acceptedAt: null, expiresAt: { gt: new Date() } }
  });

  return NextResponse.json({ success: true, data: invites });
}

// POST /api/team/invite - Send team invite (admin or owner only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'owner']);
    if (auth instanceof NextResponse) return auth;

    const { email, role, orgSlug } = await request.json() as { email: string; role: Role; orgSlug?: string };

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const org = await db.organization.findFirst({
      where: orgSlug ? { slug: orgSlug, id: auth.user.orgId } : { id: auth.user.orgId }
    });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const existingMember = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingMember && existingMember.orgId === auth.user.orgId) {
      return NextResponse.json({ success: false, error: 'This user is already in your team' }, { status: 409 });
    }
    if (existingMember) {
      return NextResponse.json({ success: false, error: 'This user already has an account' }, { status: 409 });
    }

    const token = generateInviteToken();
    const expiresAt = getInviteExpiry();

    await db.teamInvite.create({
      data: {
        orgId: org.id,
        email: email.toLowerCase(),
        role: role || 'member',
        token,
        invitedBy: auth.user.id,
        expiresAt,
      }
    });

    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?invite-token=${token}`;

    if (isEmailConfigured()) {
      await sendTeamInviteEmail(email, org.name, auth.user.email, acceptUrl, role || 'member');
    }

    return NextResponse.json({ success: true, data: { token, expiresAt } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to send invite' }, { status: 500 });
  }
}

// DELETE /api/team/invite - Cancel invite (admin or owner only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'owner']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json({ success: false, error: 'Invite ID required' }, { status: 400 });
    }

    const existing = await db.teamInvite.findFirst({
      where: { id: inviteId, orgId: auth.user.orgId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 });
    }

    await db.teamInvite.delete({ where: { id: inviteId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to cancel invite' }, { status: 500 });
  }
}
