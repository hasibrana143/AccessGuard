import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/rbac';
import { createSubscription, createCustomer, getStripePriceId } from '@/lib/stripe';
import { logger } from '@/lib/error-logger';
type PlanId = 'starter' | 'agency' | 'enterprise';

// POST /api/stripe/create-subscription - Create a subscription for an organization
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const verified = await requireVerifiedEmail(request);
    if (verified instanceof NextResponse) return verified;

    // Parse request body
    const body = await request.json();
    const { planId, priceId, interval = 'month' } = body as {
      planId?: PlanId;
      priceId?: string;
      interval?: 'month' | 'year';
    };

    // Validate that either planId or priceId is provided
    if (!planId && !priceId) {
      return NextResponse.json(
        { success: false, error: 'Either planId or priceId is required' },
        { status: 400 }
      );
    }

    // Get user and organization
    const user = await db.user.findUnique({
      where: { id: payload.userId },
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

    // Determine the price ID
    const finalPriceId = priceId ?? (planId ? getStripePriceId(planId) : null);

    if (!finalPriceId) {
      return NextResponse.json(
        { success: false, error: 'Could not determine price ID' },
        { status: 400 }
      );
    }

    // Create subscription
    const subscription = await createSubscription(customerId, finalPriceId);

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // Update organization with subscription ID (will be updated again on webhook)
    await db.organization.update({
      where: { id: user.orgId },
      data: {
        stripeSubscriptionId: subscription.id,
        plan: planId ?? 'starter',
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
