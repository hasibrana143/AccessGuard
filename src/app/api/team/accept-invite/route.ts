import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/team/accept-invite - Get invite details
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token required' }, { status: 400 });
  }

  const invite = await db.teamInvite.findUnique({
    where: { token },
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
export async function POST(request: Request) {
  try {
    const { token, name, password } = await request.json();

    const invite = await db.teamInvite.findUnique({
      where: { token },
      include: { organization: true }
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'Invalid or expired invite' }, { status: 400 });
    }

    // Check if user exists
    let user = await db.user.findUnique({ where: { email: invite.email } });

    if (!user) {
      // Create new user
      const { hashPassword } = await import('@/lib/auth');
      const hashedPassword = await hashPassword(password);
      
      user = await db.user.create({
        data: {
          email: invite.email,
          name,
          password: hashedPassword,
          role: invite.role,
          orgId: invite.orgId,
        }
      });
    } else {
      // Update existing user's org and role
      user = await db.user.update({
        where: { id: user.id },
        data: { orgId: invite.orgId, role: invite.role }
      });
    }

    // Mark invite as accepted
    await db.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      data: { userId: user.id, email: user.email }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to accept invite' }, { status: 500 });
  }
}
