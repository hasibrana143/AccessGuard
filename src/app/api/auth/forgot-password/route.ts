import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateResetToken, hashToken, getTokenExpiry } from '@/lib/password-reset';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/email';

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = generateResetToken();
    const hashedToken = hashToken(token);
    const expiresAt = getTokenExpiry();

    await db.passwordReset.create({
      data: {
        email: email.toLowerCase(),
        token: hashedToken,
        expiresAt,
      }
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`;
    
    if (isEmailConfigured()) {
      await sendPasswordResetEmail(email, token, resetUrl);
    }

    // In demo mode, return the token for testing
    return NextResponse.json({
      success: true,
      ...(isEmailConfigured() ? {} : { demoToken: token })
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
