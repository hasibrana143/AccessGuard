import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/error-logger';
import { createAuditLog } from '@/lib/audit';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { isCurrencyCode, CURRENCIES, CURRENCY_RATES, type CurrencyCode } from '@/lib/stripe';

// GET /api/billing/currency - Read org billing currency + FX snapshot
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { currency: true, plan: true },
    });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const currency: CurrencyCode = isCurrencyCode(org.currency) ? org.currency : 'usd';

    return NextResponse.json({
      success: true,
      data: {
        currency,
        symbol: CURRENCIES[currency].symbol,
        rates: CURRENCY_RATES,
        supported: Object.keys(CURRENCIES),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'get currency failed');
    return NextResponse.json({ success: false, error: 'Failed to read currency' }, { status: 500 });
  }
}

// PATCH /api/billing/currency - Change org billing currency (admin/owner)
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`billing-currency:${clientId}`, { interval: 60 * 1000, limit: 10 });
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Access denied. Admin role required.' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as { currency?: unknown } | null;
    if (!body || typeof body.currency !== 'string' || !isCurrencyCode(body.currency)) {
      return NextResponse.json(
        { success: false, error: `Invalid currency. Supported: ${Object.keys(CURRENCIES).join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await db.organization.update({
      where: { id: orgId },
      data: { currency: body.currency },
      select: { currency: true },
    });

    await createAuditLog({
      orgId,
      action: 'settings.updated',
      metadata: {
        field: 'billing.currency',
        value: updated.currency,
        actorId: (session.user as { id?: string }).id,
      },
      userId: (session.user as { id?: string }).id,
    });

    return NextResponse.json({
      success: true,
      data: { currency: updated.currency, symbol: CURRENCIES[updated.currency as CurrencyCode].symbol },
    });
  } catch (error) {
    logger.error({ err: error }, 'update currency failed');
    return NextResponse.json({ success: false, error: 'Failed to update currency' }, { status: 500 });
  }
}
