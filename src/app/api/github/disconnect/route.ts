import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { revokeToken, isGitHubConfigured } from '@/lib/github';
import { logger } from '@/lib/error-logger';
import { decryptSecret, isEncrypted } from '@/lib/crypto';

// POST /api/github/disconnect - Disconnect GitHub account
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
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

    const verified = await requireVerifiedEmail(request, { permission: PERMISSIONS.MANAGE_GITHUB });
    if (verified instanceof NextResponse) return verified;

    // Get current user
    const user = await db.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Revoke GitHub token if configured
    if (user.githubToken && isGitHubConfigured()) {
      const plainToken = isEncrypted(user.githubToken) ? (decryptSecret(user.githubToken) ?? user.githubToken) : user.githubToken;
      await revokeToken(plainToken);
    }

    // Clear GitHub token from database
    await db.user.update({
      where: { id: payload.userId },
      data: {
        githubToken: null,
        updatedAt: new Date()
      }
    });

    // Log the disconnection
    await db.auditLog.create({
      data: {
        orgId: payload.orgId,
        action: 'github_disconnected',
        metadata: JSON.stringify({
          userId: payload.userId,
          isDemo: !isGitHubConfigured()
        })
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'GitHub account disconnected successfully'
      }
    });

  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect GitHub account' },
      { status: 500 }
    );
  }
}
