import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { createSubscription, createCustomer, getStripePriceId } from '@/lib/stripe';
import { type PlanId } from '@/lib/stripe-config';

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

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only admins can manage subscriptions' },
        { status: 403 }
      );
    }

    // Get or create Stripe customer
    let customerId = user.organization.stripeCustomerId;

    if (!customerId) {
      // Create customer first
      const customer = await createCustomer(user.email, user.organization.name, {
        orgId: user.orgId,
        userId: user.id,
      });
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
    const finalPriceId = priceId ?? (planId ? getStripePriceId(planId, interval) : null);

    if (!finalPriceId) {
      return NextResponse.json(
        { success: false, error: 'Could not determine price ID' },
        { status: 400 }
      );
    }

    // Create subscription
    const { subscription, clientSecret } = await createSubscription(customerId, finalPriceId, {
      orgId: user.orgId,
      planId: planId ?? 'starter',
    });

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
        clientSecret,
        customerId,
      },
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
