import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateInviteToken, getInviteExpiry, type Role } from '@/lib/team';
import { sendTeamInviteEmail, isEmailConfigured } from '@/lib/email';

// GET /api/team/invite - List pending invites
export async function GET() {
  const org = await db.organization.findFirst({ where: { slug: 'demo-org' } });
  if (!org) return NextResponse.json({ success: true, data: [] });

  const invites = await db.teamInvite.findMany({
    where: { orgId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } }
  });

  return NextResponse.json({ success: true, data: invites });
}

// POST /api/team/invite - Send team invite
export async function POST(request: Request) {
  try {
    const { email, role } = await request.json() as { email: string; role: Role };
    
    const org = await db.organization.findFirst({ where: { slug: 'demo-org' } });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const token = generateInviteToken();
    const expiresAt = getInviteExpiry();

    await db.teamInvite.create({
      data: {
        orgId: org.id,
        email: email.toLowerCase(),
        role,
        token,
        invitedBy: 'demo-user',
        expiresAt,
      }
    });

    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?invite-token=${token}`;
    
    if (isEmailConfigured()) {
      await sendTeamInviteEmail(email, org.name, 'Demo User', acceptUrl, role);
    }

    return NextResponse.json({ success: true, data: { token, expiresAt } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to send invite' }, { status: 500 });
  }
}

// DELETE /api/team/invite - Cancel invite
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('id');

    if (!inviteId) {
      return NextResponse.json({ success: false, error: 'Invite ID required' }, { status: 400 });
    }

    await db.teamInvite.delete({ where: { id: inviteId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to cancel invite' }, { status: 500 });
  }
}
