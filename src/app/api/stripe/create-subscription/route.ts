import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { createSubscription, createCustomer, getStripePriceId, PRICING_PLANS, type PlanType } from '@/lib/stripe';
import { logger } from '@/lib/error-logger';

// POST /api/stripe/create-subscription - Create a subscription for an organization
export async function POST(request: NextRequest) {
  try {
    const verified = await requireVerifiedEmail(request, { permission: PERMISSIONS.MANAGE_BILLING });
    if (verified instanceof NextResponse) return verified;

    // Parse request body
    const body = await request.json();
    const { planId, priceId } = body as {
      planId?: PlanType;
      priceId?: string;
    };

    // Validate that either planId or priceId is provided
    if (!planId && !priceId) {
      return NextResponse.json(
        { success: false, error: 'Either planId or priceId is required' },
        { status: 400 }
      );
    }

    // Whitelist priceId against the canonical plan price IDs — blocks arbitrary/zero prices
    const canonicalPriceIds = new Set(PRICING_PLANS.map((p) => p.priceId).filter(Boolean) as string[]);
    let finalPriceId: string | null = null;
    if (priceId) {
      if (!canonicalPriceIds.has(priceId)) {
        return NextResponse.json(
          { success: false, error: 'Unknown price ID' },
          { status: 400 }
        );
      }
      finalPriceId = priceId;
    } else if (planId) {
      finalPriceId = getStripePriceId(planId);
      if (!finalPriceId || !canonicalPriceIds.has(finalPriceId)) {
        return NextResponse.json(
          { success: false, error: 'Could not resolve a valid price ID for the requested plan' },
          { status: 400 }
        );
      }
    }

    // Get user and organization
    const user = await db.user.findUnique({
      where: { id: verified.user.id },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organization) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      );
    }

    // Only admins/owners can manage subscriptions
    if (user.role !== 'admin' && user.role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Only admins can manage subscriptions' },
        { status: 403 }
      );
    }

    // Get or create Stripe customer
    let customerId = user.organization.stripeCustomerId;

    if (!customerId) {
      // Create customer first
      const customer = await createCustomer(user.email, user.organization.name ?? undefined);
      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Failed to create customer' },
          { status: 500 }
        );
      }
      customerId = customer.id;

      // Update organization with customer ID
      await db.organization.update({
        where: { id: user.orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Check if organization already has an active subscription
    if (user.organization.stripeSubscriptionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization already has a subscription. Use update-subscription to change plans.',
        },
        { status: 400 }
      );
    }

    // Create subscription
    if (!finalPriceId) {
      return NextResponse.json(
        { success: false, error: 'Could not determine price ID' },
        { status: 400 }
      );
    }
    const subscription = await createSubscription(customerId, finalPriceId, user.orgId);

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // Update organization with subscription ID (will be updated again on webhook)
    const planFromPriceId = PRICING_PLANS.find((p) => p.priceId === finalPriceId)?.id;
    await db.organization.update({
      where: { id: user.orgId },
      data: {
        stripeSubscriptionId: subscription.id,
        plan: planId ?? planFromPriceId ?? 'starter',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
