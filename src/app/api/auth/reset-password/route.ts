import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashToken, isTokenExpired } from '@/lib/password-reset';
import { hashPassword } from '@/lib/auth';

// POST /api/auth/reset-password - Reset password with token
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ success: false, error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters and include letters and numbers' },
        { status: 400 }
      );
    }
    if (password.length > 128) {
      return NextResponse.json({ success: false, error: 'Password must be at most 128 characters' }, { status: 400 });
    }

    const hashedToken = hashToken(token);

    const resetRecord = await db.passwordReset.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetRecord) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
    }

    if (isTokenExpired(resetRecord.expiresAt)) {
      return NextResponse.json({ success: false, error: 'Token has expired' }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Update user password
    await db.user.update({
      where: { email: resetRecord.email },
      data: { password: newPasswordHash }
    });

    // Mark token as used
    await db.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to reset password' }, { status: 500 });
  }
}

// GET /api/auth/reset-password - Verify token validity
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
  }

  const hashedToken = hashToken(token);

  const resetRecord = await db.passwordReset.findFirst({
    where: {
      token: hashedToken,
      used: false,
      expiresAt: { gt: new Date() }
    }
  });

  if (!resetRecord) {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { email: resetRecord.email } });
}
