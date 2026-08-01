import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateMfaSecret, generateQrDataUrl, verifyMfaCode, encryptMfaSecret, readMfaSecret } from '@/lib/mfa';
import { logger } from '@/lib/error-logger';

// GET /api/auth/mfa/setup - Start MFA enrollment (returns secret + QR)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

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
    const { userId, code } = await request.json();

    if (!userId || !code) {
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

// DELETE /api/auth/mfa/setup - Disable MFA
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.mfaEnabledAt) {
      return NextResponse.json({ success: false, error: 'MFA is not enabled' }, { status: 400 });
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
