import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Price IDs - create these in Stripe Dashboard
const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: 'price_starter_monthly',
    yearly: 'price_starter_yearly',
  },
  agency: {
    monthly: 'price_agency_monthly',
    yearly: 'price_agency_yearly',
  },
};

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { orgId, plan = 'starter', interval = 'monthly', email } = body;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await db.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create or get Stripe customer
    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: {
          orgId: org.id,
          orgName: org.name,
        },
      });
      customerId = customer.id;

      // Update org with customer ID
      await db.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get price ID
    const priceId = PRICE_IDS[plan]?.[interval];
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan or interval' },
        { status: 400 }
      );
    }

    // Create checkout session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${appUrl}/dashboard?canceled=true`,
      metadata: {
        orgId,
        plan,
        interval,
      },
      subscription_data: {
        metadata: {
          orgId,
          plan,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
