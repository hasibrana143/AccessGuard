// Pending Invites API Route
// GET /api/team/pending-invites - List pending invites
// DELETE /api/team/pending-invites - Cancel an invite

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getPendingInvites, cancelTeamInvite } from '@/lib/team';
import { logger } from '@/lib/error-logger';
import { requireRole } from '@/lib/rbac';

// GET /api/team/pending-invites - List pending invites
export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'owner']);
    if (auth instanceof NextResponse) return auth;

    // Get pending invites
    const invites = await getPendingInvites(auth.user.orgId);

    // Get inviter names
    const inviterIds = [...new Set(invites.map(i => i.invitedBy).filter(Boolean))] as string[];
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
      invitedBy: invite.invitedBy ? inviterMap.get(invite.invitedBy) || null : null,
    }));

    return NextResponse.json({
      success: true,
      data: invitesWithInviters,
    });

  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to get pending invites' },
      { status: 500 }
    );
  }
}

// DELETE /api/team/pending-invites - Cancel an invite (admin or owner only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(request, ['admin', 'owner']);
    if (auth instanceof NextResponse) return auth;

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
    await cancelTeamInvite(inviteId, auth.user.orgId);

    // Log the action
    await db.auditLog.create({
      data: {
        orgId: auth.user.orgId,
        action: 'team_invite_cancelled',
        metadata: JSON.stringify({
          inviteId,
          cancelledBy: auth.user.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Invite cancelled successfully' },
    });

  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to cancel invite' },
      { status: 500 }
    );
  }
}
