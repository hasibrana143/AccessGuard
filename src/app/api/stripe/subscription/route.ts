import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireAuth, requireVerifiedEmail } from '@/lib/rbac';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { PERMISSIONS } from '@/lib/permissions';
import { PRICING_PLANS, getPlanFromPriceId, getStripePriceId, getStripeClient, isStripeConfigured, type PlanType } from '@/lib/stripe';

// GET /api/stripe/subscription - Get the CALLER's org subscription + usage.
// Guard chain: auth first.
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`stripe-subscribe:${clientId}`, rateLimits.default);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    if (!auth.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'No organization assigned' },
        { status: 403 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: auth.user.orgId },
      include: { _count: { select: { projects: true } } },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const scansThisMonth = await db.scan.aggregate({
      where: { project: { orgId: org.id }, createdAt: { gte: startOfMonth } },
      _sum: { pagesScanned: true },
    });

    const plan = (org.plan || 'starter') as PlanType;
    const planLimits =
      PRICING_PLANS.find((p) => p.id === plan)?.limits || { websites: 1, pagesPerMonth: 100 };

    return NextResponse.json({
      success: true,
      data: {
        subscription: org.stripeSubscriptionId
          ? {
              id: org.id,
              status: org.subscriptionStatus || 'active',
              plan,
              currentPeriodEnd: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
              ).toISOString(),
            }
          : null,
        plan,
        usage: {
          websites: org._count.projects,
          websitesLimit: planLimits.websites === -1 ? 999 : planLimits.websites,
          pagesScanned: scansThisMonth._sum.pagesScanned || 0,
          pagesLimit:
            planLimits.pagesPerMonth === -1 ? 99999 : planLimits.pagesPerMonth,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/stripe/subscription - Create a real Stripe subscription for the caller's org.
// Plan changes themselves arrive via the Stripe webhook (source of truth) —
// this endpoint only creates the subscription object in Stripe.
export async function POST(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, {
      permission: PERMISSIONS.MANAGE_BILLING,
    });
    if (verified instanceof NextResponse) return verified;

    if (!isStripeConfigured()) {
      return NextResponse.json({ success: false, error: 'Billing is not configured' }, { status: 503 });
    }

    const { plan } = await request.json();
    const priceId = getStripePriceId(String(plan ?? '') as PlanType);
    if (!priceId) {
      return NextResponse.json({ success: false, error: 'Unknown plan' }, { status: 400 });
    }

    const org = await db.organization.findUnique({
      where: { id: verified.user.orgId },
      select: { stripeCustomerId: true, stripeSubscriptionId: true },
    });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }
    if (org.stripeSubscriptionId) {
      return NextResponse.json({ success: false, error: 'Subscription already exists — manage it via checkout portal' }, { status: 409 });
    }
    if (!org.stripeCustomerId) {
      return NextResponse.json({ success: false, error: 'No Stripe customer — start via checkout first' }, { status: 400 });
    }

    const stripe = getStripeClient()!;
    const subscription = await stripe.subscriptions.create({
      customer: org.stripeCustomerId,
      items: [{ price: priceId }],
      metadata: { orgId: verified.user.orgId, plan: getPlanFromPriceId(priceId) },
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return NextResponse.json({
      success: true,
      data: { status: subscription.status, plan: getPlanFromPriceId(priceId), subscriptionId: subscription.id },
    });
  } catch (error) {
    logger.error({ err: error }, 'Stripe subscription create failed');
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/stripe/subscription - Cancel the caller's real Stripe subscription.
// The org plan flips to free via the customer.subscription.deleted webhook.
export async function DELETE(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, {
      permission: PERMISSIONS.MANAGE_BILLING,
    });
    if (verified instanceof NextResponse) return verified;

    if (!isStripeConfigured()) {
      return NextResponse.json({ success: false, error: 'Billing is not configured' }, { status: 503 });
    }

    const org = await db.organization.findUnique({
      where: { id: verified.user.orgId },
      select: { stripeSubscriptionId: true },
    });
    if (!org?.stripeSubscriptionId) {
      return NextResponse.json({ success: false, error: 'No active subscription' }, { status: 404 });
    }

    const stripe = getStripeClient()!;
    await stripe.subscriptions.cancel(org.stripeSubscriptionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Stripe subscription cancel failed');
    return NextResponse.json(
      { success: false, error: 'Failed to cancel' },
      { status: 500 }
    );
  }
}
