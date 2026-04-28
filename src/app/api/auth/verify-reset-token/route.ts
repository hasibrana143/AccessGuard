import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, isTokenExpired } from '@/lib/password-reset';

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

    // Find all non-expired, unused reset tokens
    const resetTokens = await db.passwordReset.findMany({
      where: {
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    // Find the matching token by verifying the hash
    let matchedToken = null;
    for (const resetToken of resetTokens) {
      if (verifyToken(resetToken.token, token)) {
        matchedToken = resetToken;
        break;
      }
    }

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
    console.error('Verify reset token error:', error);
    return NextResponse.json(
      { success: false, valid: false, error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
