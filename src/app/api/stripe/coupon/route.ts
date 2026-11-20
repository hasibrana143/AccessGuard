import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { getStripeClient } from '@/lib/stripe';
import { logger } from '@/lib/error-logger';

// POST /api/stripe/coupon - Apply a coupon to the organization's subscription
export async function POST(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, { permission: PERMISSIONS.MANAGE_BILLING });
    if (verified instanceof NextResponse) return verified;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.trim() === '') {
      return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        settings: true,
      },
    });

    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json({ success: false, error: 'Billing is not configured' }, { status: 503 });
    }
    if (!org.stripeSubscriptionId) {
      return NextResponse.json({ success: false, error: 'No active subscription to apply a coupon to' }, { status: 400 });
    }

    const couponName = code.trim().toUpperCase();
    let percentOff: number | null = null;
    let description = 'Coupon applied';

    try {
      const coupon = await stripe.coupons.retrieve(couponName);
      if (!coupon) {
        return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 400 });
      }
      percentOff = coupon.percent_off ?? null;
      description = coupon.name || `Coupon ${couponName}`;
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        coupon: coupon.id,
      } as Parameters<typeof stripe.subscriptions.update>[1]);
    } catch (error) {
      logger.error({ err: error }, 'Stripe coupon apply failed');
      return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 400 });
    }

    // Persist coupon in org settings
    let settings: Record<string, unknown> = {};
    try {
      settings = JSON.parse(org.settings || '{}');
    } catch { /* ignore */ }
    settings.coupon = {
      code: couponName,
      percentOff,
      appliedAt: new Date().toISOString(),
    };
    await db.organization.update({
      where: { id: orgId },
      data: { settings: JSON.stringify(settings) },
    });

    await db.auditLog.create({
      data: {
        orgId,
        action: 'subscription_changed',
        metadata: JSON.stringify({
          coupon: couponName,
          percentOff,
          description,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        code: couponName,
        percentOff,
        description,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to apply coupon' }, { status: 500 });
  }
}

// GET /api/stripe/coupon - Get currently applied coupon
export async function GET() {
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
      select: { settings: true },
    });

    let coupon: Record<string, unknown> | null = null;
    try {
      const settings = JSON.parse(org?.settings || '{}');
      if (settings.coupon) coupon = settings.coupon as Record<string, unknown>;
    } catch { /* ignore */ }

    return NextResponse.json({ success: true, data: coupon });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to fetch coupon' }, { status: 500 });
  }
}
