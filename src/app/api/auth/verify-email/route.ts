import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { db } from '@/lib/db';
import { sendVerificationEmail, isEmailConfigured } from '@/lib/email';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/verify-email - Send verification email (or resend)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

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

    if (user.emailVerifiedAt) {
      return NextResponse.json({ success: true, data: { alreadyVerified: true } });
    }

    const token = randomBytes(32).toString('hex');
    const hashedToken = hashToken(token);

    await db.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: hashedToken }
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    if (isEmailConfigured()) {
      await sendVerificationEmail(user.email, user.name || 'there', verifyUrl);
    }

    return NextResponse.json({
      success: true,
      ...(isEmailConfigured() || process.env.NODE_ENV === 'production' ? {} : { demoToken: token })
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}

// GET /api/auth/verify-email?token=... - Verify the email token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
    }

    const hashedToken = hashToken(token);

    const user = await db.user.findFirst({
      where: { emailVerificationToken: hashedToken }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid or expired verification link' }, { status: 400 });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ success: true, data: { alreadyVerified: true } });
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null
      }
    });

    await db.auditLog.create({
      data: {
        orgId: user.orgId,
        action: 'email_verified',
        metadata: JSON.stringify({ userId: user.id })
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to verify email' }, { status: 500 });
  }
}
