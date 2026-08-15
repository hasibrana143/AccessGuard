import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireAuth, requireVerifiedEmail } from '@/lib/rbac';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { PERMISSIONS } from '@/lib/permissions';
import { PRICING_PLANS, getPlanFromPriceId, type PlanType } from '@/lib/stripe';

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
        isDemo: !process.env.STRIPE_SECRET_KEY,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST /api/stripe/subscription - Update caller's org plan (demo when Stripe unset)
export async function POST(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, {
      permission: PERMISSIONS.MANAGE_BILLING,
    });
    if (verified instanceof NextResponse) return verified;

    const { priceId } = await request.json();
    const plan = getPlanFromPriceId(String(priceId ?? ''));

    await db.organization.update({
      where: { id: verified.user.orgId },
      data: { plan, subscriptionStatus: 'active' },
    });

    return NextResponse.json({
      success: true,
      data: { status: 'active', plan },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/stripe/subscription - Cancel caller's org subscription
export async function DELETE(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, {
      permission: PERMISSIONS.MANAGE_BILLING,
    });
    if (verified instanceof NextResponse) return verified;

    await db.organization.update({
      where: { id: verified.user.orgId },
      data: { plan: 'starter', subscriptionStatus: 'canceled' },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to cancel' },
      { status: 500 }
    );
  }
}
