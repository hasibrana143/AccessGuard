// Pending Invites API Route
// GET /api/team/pending-invites - List pending invites
// DELETE /api/team/pending-invites - Cancel an invite

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { getPendingInvites, cancelTeamInvite } from '@/lib/team';

// GET /api/team/pending-invites - List pending invites
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get pending invites
    const invites = await getPendingInvites(payload.orgId);

    // Get inviter names
    const inviterIds = [...new Set(invites.map(i => i.invitedBy))];
    const inviters = await db.user.findMany({
      where: { id: { in: inviterIds } },
      select: { id: true, name: true, email: true },
    });

    const inviterMap = new Map(inviters.map(i => [i.id, i]));

    const invitesWithInviters = invites.map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      invitedBy: inviterMap.get(invite.invitedBy) || null,
    }));

    return NextResponse.json({
      success: true,
      data: invitesWithInviters,
    });

  } catch (error) {
    console.error('Get pending invites error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get pending invites' },
      { status: 500 }
    );
  }
}

// DELETE /api/team/pending-invites - Cancel an invite
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get current user
    const currentUser = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, orgId: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only admins can cancel invites
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can cancel invites' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { inviteId } = body;

    if (!inviteId || typeof inviteId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invite ID is required' },
        { status: 400 }
      );
    }

    // Cancel the invite
    await cancelTeamInvite(inviteId, currentUser.orgId);

    // Log the action
    await db.auditLog.create({
      data: {
        orgId: currentUser.orgId,
        action: 'team_invite_cancelled',
        metadata: JSON.stringify({
          inviteId,
          cancelledBy: currentUser.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Invite cancelled successfully' },
    });

  } catch (error) {
    console.error('Cancel invite error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel invite' },
      { status: 500 }
    );
  }
}
