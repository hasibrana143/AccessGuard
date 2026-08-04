import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateResetToken, hashToken, getTokenExpiry } from '@/lib/password-reset';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/email';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse } from '@/lib/rate-limit';

// POST /api/auth/forgot-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const clientId = getClientIdentifier(request);
    const rateResult = await checkRateLimit(`reset:${clientId}:${email.toLowerCase()}`, { interval: 15 * 60 * 1000, limit: 3 });
    if (!rateResult.success) return createRateLimitResponse(rateResult);

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

    // Cap pending reset tokens per email to prevent unbounded table growth
    const pendingCount = await db.passwordReset.count({
      where: { email: email.toLowerCase(), used: false },
    });
    if (pendingCount > 5) {
      const stale = await db.passwordReset.findMany({
        where: { email: email.toLowerCase(), used: false },
        orderBy: { createdAt: 'asc' },
        take: pendingCount - 5,
        select: { id: true },
      });
      await db.passwordReset.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
    }

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`;
    
    if (isEmailConfigured()) {
      await sendPasswordResetEmail(email, token, resetUrl);
    }

    // In demo mode, return the token for testing (never in production)
    return NextResponse.json({
      success: true,
      ...(isEmailConfigured() || process.env.NODE_ENV === 'production' ? {} : { demoToken: token })
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
