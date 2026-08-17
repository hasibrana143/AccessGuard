import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/error-logger';

const VALID_CONSENT = ['accepted', 'declined', 'pending'] as const;
type ConsentValue = typeof VALID_CONSENT[number];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ consent: 'pending' });
    }

    const consent = await db.cookieConsent.findUnique({
      where: { userId: user.id },
      select: { consent: true, version: true, createdAt: true, updatedAt: true },
    });

    if (!consent) {
      return NextResponse.json({ consent: 'pending' });
    }

    return NextResponse.json({
      consent: consent.consent,
      version: consent.version,
      createdAt: consent.createdAt.toISOString(),
      updatedAt: consent.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get cookie consent');
    return NextResponse.json({ error: 'Failed to get consent' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      consent?: unknown;
      version?: unknown;
    } | null;

    if (!body || typeof body.consent !== 'string') {
      return NextResponse.json({ error: 'consent is required' }, { status: 400 });
    }

    const consentValue = body.consent as ConsentValue;
    if (!VALID_CONSENT.includes(consentValue)) {
      return NextResponse.json({ error: 'Invalid consent value' }, { status: 400 });
    }

    const version = typeof body.version === 'string' ? body.version : '1.0';

    // Get client info for audit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await db.cookieConsent.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        consent: consentValue,
        version,
        ipAddress: ip,
        userAgent,
      },
      update: {
        consent: consentValue,
        version,
        ipAddress: ip,
        userAgent,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        orgId: user.orgId,
        action: 'cookie_consent_updated',
        metadata: JSON.stringify({
          userId: user.id,
          consent: consentValue,
          version,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({ success: true, consent: consentValue, version });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update cookie consent');
    return NextResponse.json({ error: 'Failed to update consent' }, { status: 500 });
  }
}