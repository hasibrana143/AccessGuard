import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken, isTokenExpired } from '@/lib/password-reset';
import { logger } from '@/lib/error-logger';

// GET /api/auth/verify-reset-token?token=xxx
// Verify if a reset token is valid and not expired
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Direct hash lookup — same pattern as reset-password; no full-table scan
    const matchedToken = await db.passwordReset.findFirst({
      where: {
        token: hashToken(token),
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!matchedToken) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Invalid or expired reset token',
      });
    }

    // Check if token is expired
    if (isTokenExpired(matchedToken.expiresAt)) {
      return NextResponse.json({
        success: true,
        valid: false,
        error: 'Reset token has expired',
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      email: matchedToken.email, // Return email so user knows which account they're resetting
    });

  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, valid: false, error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
