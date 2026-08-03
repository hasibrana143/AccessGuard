import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const plan = session.metadata?.plan || 'starter';
        const subscriptionId = session.subscription as string;

        if (orgId) {
          // Merge with existing settings instead of overwriting
          const existing = await db.organization.findUnique({ where: { id: orgId }, select: { settings: true } });
          const existingSettings = existing?.settings ? JSON.parse(existing.settings) : {};
          await db.organization.update({
            where: { id: orgId },
            data: {
              plan,
              stripeSubscriptionId: subscriptionId,
              settings: JSON.stringify({
                ...existingSettings,
                planActivated: new Date().toISOString(),
                customerId: session.customer,
              }),
            },
          });

          // Create audit log
          await db.auditLog.create({
            data: {
              orgId,
              action: 'subscription_created',
              metadata: JSON.stringify({
                plan,
                subscriptionId,
                customerId: session.customer,
              }),
            },
          });

          logger.info(`Subscription activated for org ${orgId}: ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (orgId) {
          const plan = subscription.metadata?.plan || 'starter';
          const status = subscription.status;

          await db.organization.update({
            where: { id: orgId },
            data: {
              plan: status === 'active' ? plan : 'starter',
              stripeSubscriptionId: subscription.id,
            },
          });

          logger.info(`Subscription updated for org ${orgId}: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (orgId) {
          await db.organization.update({
            where: { id: orgId },
            data: {
              plan: 'starter',
              stripeSubscriptionId: null,
            },
          });

          // Create audit log
          await db.auditLog.create({
            data: {
              orgId,
              action: 'subscription_cancelled',
              metadata: JSON.stringify({
                subscriptionId: subscription.id,
              }),
            },
          });

          logger.info(`Subscription cancelled for org ${orgId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        const subscriptionId = invoice.subscription;

        if (subscriptionId && typeof subscriptionId === 'string') {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const orgId = subscription.metadata?.orgId;

          if (orgId) {
            await db.auditLog.create({
              data: {
                orgId,
                action: 'payment_succeeded',
                metadata: JSON.stringify({
                  invoiceId: invoice.id,
                  amount: invoice.amount_paid,
                  currency: invoice.currency,
                }),
              },
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        const subscriptionId = invoice.subscription;

        if (subscriptionId && typeof subscriptionId === 'string') {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const orgId = subscription.metadata?.orgId;

          if (orgId) {
            await db.auditLog.create({
              data: {
                orgId,
                action: 'payment_failed',
                metadata: JSON.stringify({
                  invoiceId: invoice.id,
                  attemptCount: invoice.attempt_count,
                }),
              },
            });

            logger.info(`Payment failed for org ${orgId}`);
          }
        }
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
