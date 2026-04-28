import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateInviteToken, getInviteExpiry, type Role } from '@/lib/team';
import { sendTeamInviteEmail, isEmailConfigured } from '@/lib/email';

// GET /api/team/members - List team members
export async function GET() {
  const org = await db.organization.findFirst({
    where: { slug: 'demo-org' },
    include: { users: { select: { id: true, email: true, name: true, role: true, avatar: true } } }
  });

  return NextResponse.json({ success: true, data: org?.users || [] });
}

// PATCH /api/team/members - Update member role
export async function PATCH(request: Request) {
  try {
    const { userId, role } = await request.json();
    
    await db.user.update({
      where: { id: userId },
      data: { role }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/team/members - Remove member
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    await db.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to remove member' }, { status: 500 });
  }
}
