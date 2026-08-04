import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { hashToken } from '@/lib/password-reset';

function isValidPassword(pw: string): boolean {
  return typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

// GET /api/team/accept-invite - Get invite details
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token required' }, { status: 400 });
  }

  const invite = await db.teamInvite.findFirst({
    where: { token: hashToken(token) },
    include: { organization: { select: { name: true } } }
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: 'Invalid or expired invite' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: {
      email: invite.email,
      role: invite.role,
      organizationName: invite.organization.name
    }
  });
}

// POST /api/team/accept-invite - Accept invite
export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    const invite = await db.teamInvite.findFirst({
      where: { token: hashToken(token) },
      include: { organization: true }
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Invalid or expired invite' }, { status: 400 });
    }

    // Atomic claim — prevents double-accept race
    const claimed = await db.teamInvite.updateMany({
      where: { id: invite.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ success: false, error: 'Invite has already been accepted' }, { status: 409 });
    }

    const existingUser = await db.user.findUnique({ where: { email: invite.email } });

    if (existingUser) {
      // Reassigning an existing account to a new org is a destructive move — it
      // must be done by the account owner themselves, not by whoever happens to
      // hold the invite token. Require a matching authenticated session.
      const session = await getServerSession();
      if (!session?.user || String((session.user as { email?: string }).email) !== invite.email) {
        // Roll back the invite claim so the legitimate invitee can still accept
        await db.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: null } });
        return NextResponse.json(
          {
            success: false,
            error: 'An account already exists for this email. Sign in with that account to accept the invite.',
            needAuth: true,
          },
          { status: 401 }
        );
      }
      const updated = await db.user.update({
        where: { id: existingUser.id },
        data: { orgId: invite.orgId, role: invite.role }
      });
      return NextResponse.json({ success: true, data: { userId: updated.id, email: updated.email } });
    }

    // New user registration via invite link — email ownership is implied by the token
    if (!isValidPassword(password)) {
      // Roll back the invite claim
      await db.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: null } });
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters and include letters and numbers' },
        { status: 400 }
      );
    }

    const { hashPassword } = await import('@/lib/auth');
    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email: invite.email,
        name: typeof name === 'string' ? name : null,
        password: hashedPassword,
        role: invite.role,
        orgId: invite.orgId,
        emailVerifiedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      data: { userId: user.id, email: user.email }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to accept invite' }, { status: 500 });
  }
}
