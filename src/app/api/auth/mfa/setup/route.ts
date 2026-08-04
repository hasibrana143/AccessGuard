import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateMfaSecret, generateQrDataUrl, verifyMfaCode, encryptMfaSecret, readMfaSecret } from '@/lib/mfa';
import { requireVerifiedEmail } from '@/lib/rbac';
import { logger } from '@/lib/error-logger';

// MFA enrollment must be performed by the authenticated user themselves:
// the target userId must match the session/API-token identity (anti-IDOR).
async function requireOwnMfaTarget(
  request: NextRequest,
  userId: string | null
): Promise<{ userId: string } | NextResponse> {
  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.user.id !== userId) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  return { userId };
}

// GET /api/auth/mfa/setup - Start MFA enrollment (returns secret + QR)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const email = searchParams.get('email');

    const forbidden = await requireOwnMfaTarget(request, userIdParam);
    if (forbidden instanceof NextResponse) return forbidden;
    const userId = forbidden.userId;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.mfaEnabledAt) {
      return NextResponse.json({ success: false, error: 'MFA is already enabled' }, { status: 400 });
    }

    const setup = generateMfaSecret(email || user.email);
    const qrDataUrl = await generateQrDataUrl(setup.otpauthUrl);

    // Store pending secret for activation (encrypted at rest)
    await db.user.update({
      where: { id: userId },
      data: { mfaSecret: encryptMfaSecret(setup.secret) },
    });

    return NextResponse.json({
      success: true,
      data: {
        secret: setup.secret,
        otpauthUrl: setup.otpauthUrl,
        qrDataUrl,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to start MFA setup' }, { status: 500 });
  }
}

// POST /api/auth/mfa/setup - Verify code and enable MFA
export async function POST(request: NextRequest) {
  try {
    const { userId: userIdParam, code } = await request.json();

    const forbidden = await requireOwnMfaTarget(request, userIdParam);
    if (forbidden instanceof NextResponse) return forbidden;
    const userId = forbidden.userId;

    const { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } = await import('@/lib/rate-limit');
    const clientId = getClientIdentifier(request);
    const rateResult = await checkRateLimit(`mfa-verify:${clientId}:${userId}`, { interval: 60 * 1000, limit: 5 });
    if (!rateResult.success) return createRateLimitResponse(rateResult);

    if (!code) {
      return NextResponse.json({ success: false, error: 'User ID and code are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.mfaEnabledAt) {
      return NextResponse.json({ success: false, error: 'MFA is already enabled' }, { status: 400 });
    }

    if (!user.mfaSecret) {
      return NextResponse.json({ success: false, error: 'MFA setup not started. Request a new setup first.' }, { status: 400 });
    }

    if (!verifyMfaCode(readMfaSecret(user.mfaSecret) || '', code)) {
      return NextResponse.json({ success: false, error: 'Invalid code. Check your authenticator app and try again.' }, { status: 400 });
    }

    await db.user.update({
      where: { id: userId },
      data: { mfaEnabledAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        orgId: user.orgId,
        action: 'mfa_enabled',
        metadata: JSON.stringify({ userId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to enable MFA' }, { status: 500 });
  }
}

// DELETE /api/auth/mfa/setup - Disable MFA (requires current TOTP code)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const code = searchParams.get('code');

    const forbidden = await requireOwnMfaTarget(request, userIdParam);
    if (forbidden instanceof NextResponse) return forbidden;
    const userId = forbidden.userId;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.mfaEnabledAt) {
      return NextResponse.json({ success: false, error: 'MFA is not enabled' }, { status: 400 });
    }

    // Re-authentication: a valid TOTP code must accompany the disable request
    if (!code || !verifyMfaCode(readMfaSecret(user.mfaSecret) || '', code)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid code from your authenticator app to disable MFA', needCode: true },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: userId },
      data: { mfaEnabledAt: null, mfaSecret: null },
    });

    await db.auditLog.create({
      data: {
        orgId: user.orgId,
        action: 'mfa_disabled',
        metadata: JSON.stringify({ userId }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to disable MFA' }, { status: 500 });
  }
}
