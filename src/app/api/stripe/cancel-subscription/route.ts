import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { cancelSubscription, reactivateSubscription, getSubscription } from '@/lib/stripe';

// POST /api/stripe/cancel-subscription - Cancel or reactivate a subscription
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
    const { immediately = false, reactivate = false } = body as {
      immediately?: boolean;
      reactivate?: boolean;
    };

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

    // Check if organization has a subscription
    const subscriptionId = user.organization.stripeSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Handle reactivation
    if (reactivate) {
      const subscription = await getSubscription(subscriptionId);
      
      if (!subscription) {
        return NextResponse.json(
          { success: false, error: 'Subscription not found' },
          { status: 404 }
        );
      }

      if (!subscription.cancel_at_period_end) {
        return NextResponse.json({
          success: true,
          data: {
            subscriptionId,
            status: subscription.status,
            message: 'Subscription is not scheduled for cancellation',
          },
        });
      }

      // Reactivate the subscription
      const reactivated = await reactivateSubscription(subscriptionId);
      
      // Update organization status
      await db.organization.update({
        where: { id: user.orgId },
        data: {
          subscriptionStatus: reactivated.status,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          subscriptionId,
          status: reactivated.status,
          cancelAtPeriodEnd: reactivated.cancel_at_period_end,
          message: 'Subscription reactivated successfully',
        },
      });
    }

    // Cancel subscription
    const canceled = await cancelSubscription(subscriptionId, immediately);

    // Update organization
    const updateData: {
      subscriptionStatus: string;
      plan?: string;
      stripeSubscriptionId?: string | null;
      planLimits?: string;
    } = {
      subscriptionStatus: canceled.status,
    };

    // If canceled immediately, reset to starter plan
    if (immediately || canceled.status === 'canceled') {
      updateData.plan = 'starter';
      updateData.stripeSubscriptionId = null;
      updateData.planLimits = JSON.stringify({
        maxWebsites: 1,
        maxPages: 100,
        maxUsers: 2,
      });
    }

    await db.organization.update({
      where: { id: user.orgId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId,
        status: canceled.status,
        cancelAtPeriodEnd: canceled.cancel_at_period_end,
        currentPeriodEnd: canceled.current_period_end,
        message: immediately
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at the end of the billing period',
      },
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

// GET /api/stripe/cancel-subscription - Get subscription cancellation status
export async function GET(request: NextRequest) {
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

    const subscriptionId = user.organization.stripeSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({
        success: true,
        data: {
          hasSubscription: false,
          message: 'No active subscription',
        },
      });
    }

    // Get subscription details
    const subscription = await getSubscription(subscriptionId);

    if (!subscription) {
      return NextResponse.json({
        success: true,
        data: {
          hasSubscription: false,
          message: 'Subscription not found in Stripe',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasSubscription: true,
        subscriptionId,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: subscription.current_period_end,
        cancelAt: subscription.cancel_at,
      },
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}
