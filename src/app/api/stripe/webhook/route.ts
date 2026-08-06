import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { PRICING_PLANS, type PlanType } from '@/lib/stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const PLAN_IDS = new Set<string>(PRICING_PLANS.map((p) => p.id));

// Stripe metadata is a string map — never trust it as a PlanType. Validates at
// runtime; garbage falls back to starter (fail-closed, org.plan is unguarded).
export function resolvePlanFromMetadata(value: unknown): PlanType {
  return typeof value === 'string' && PLAN_IDS.has(value) ? (value as PlanType) : 'starter';
}

// Explicit Stripe status -> (plan, subscriptionStatus) mapping.
// Trialing/past_due/incomplete never downgrade the plan — only terminal states
// drop to starter. Extracted pure for unit tests.
export function resolveSubscriptionState(
  status: string,
  metadataPlan: PlanType | undefined
): { plan: PlanType; subscriptionStatus: string } {
  switch (status) {
    case 'active':
      return { plan: metadataPlan ?? 'starter', subscriptionStatus: 'active' };
    case 'trialing':
      return { plan: metadataPlan ?? 'starter', subscriptionStatus: 'trialing' };
    case 'past_due':
    case 'incomplete':
    case 'paused':
      return { plan: metadataPlan ?? 'starter', subscriptionStatus: status };
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return { plan: 'starter', subscriptionStatus: status };
    default:
      return { plan: metadataPlan ?? 'starter', subscriptionStatus: status };
  }
}

// Stripe delivers at-least-once: claim the event id inside the same transaction
// as the mutation so replays are a no-op. Returns false when already handled.
async function claimEvent(
  tx: Prisma.TransactionClient,
  event: Stripe.Event
): Promise<boolean> {
  const existing = await tx.webhookEvent.findUnique({ where: { id: event.id } });
  if (existing) return false;
  await tx.webhookEvent.create({ data: { id: event.id, type: event.type } });
  return true;
}

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
        const plan = resolvePlanFromMetadata(session.metadata?.plan);
        const subscriptionId = session.subscription as string;

        if (orgId) {
          await db.$transaction(async (tx) => {
            if (!(await claimEvent(tx, event))) return;
            const existing = await tx.organization.findUnique({
              where: { id: orgId },
              select: { settings: true },
            });
            const existingSettings = existing?.settings ? JSON.parse(existing.settings) : {};
            await tx.organization.update({
              where: { id: orgId },
              data: {
                plan,
                subscriptionStatus: 'active',
                stripeSubscriptionId: subscriptionId,
                settings: JSON.stringify({
                  ...existingSettings,
                  planActivated: new Date().toISOString(),
                  customerId: session.customer,
                }),
              },
            });
            await tx.auditLog.create({
              data: {
                orgId,
                action: 'subscription_created',
                metadata: JSON.stringify({
                  plan,
                  subscriptionId,
                  customerId: session.customer,
                  eventId: event.id,
                }),
              },
            });
          });

          logger.info(`Subscription activated for org ${orgId}: ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (orgId) {
          const hasPlan = typeof subscription.metadata?.plan === 'string' && PLAN_IDS.has(subscription.metadata.plan);
          const currentPlan = await db.organization.findUnique({
            where: { id: orgId },
            select: { plan: true },
          });
          const { plan, subscriptionStatus } = resolveSubscriptionState(
            subscription.status,
            hasPlan
              ? (subscription.metadata!.plan as PlanType)
              : ((currentPlan?.plan as PlanType) ?? 'starter')
          );

          await db.$transaction(async (tx) => {
            if (!(await claimEvent(tx, event))) return;
            await tx.organization.update({
              where: { id: orgId },
              data: { plan, subscriptionStatus, stripeSubscriptionId: subscription.id },
            });
            await tx.auditLog.create({
              data: {
                orgId,
                action: 'subscription.changed',
                metadata: JSON.stringify({
                  status: subscription.status,
                  plan,
                  subscriptionId: subscription.id,
                  eventId: event.id,
                }),
              },
            });
          });

          logger.info(`Subscription updated for org ${orgId}: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (orgId) {
          await db.$transaction(async (tx) => {
            if (!(await claimEvent(tx, event))) return;
            await tx.organization.update({
              where: { id: orgId },
              data: { plan: 'starter', subscriptionStatus: 'canceled', stripeSubscriptionId: null },
            });
            await tx.auditLog.create({
              data: {
                orgId,
                action: 'subscription_cancelled',
                metadata: JSON.stringify({
                  subscriptionId: subscription.id,
                  eventId: event.id,
                }),
              },
            });
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
            await db.$transaction(async (tx) => {
              if (!(await claimEvent(tx, event))) return;
              await tx.auditLog.create({
                data: {
                  orgId,
                  action: 'payment_succeeded',
                  metadata: JSON.stringify({
                    invoiceId: invoice.id,
                    amount: invoice.amount_paid,
                    currency: invoice.currency,
                    eventId: event.id,
                  }),
                },
              });
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
            await db.$transaction(async (tx) => {
              if (!(await claimEvent(tx, event))) return;
              await tx.auditLog.create({
                data: {
                  orgId,
                  action: 'payment_failed',
                  metadata: JSON.stringify({
                    invoiceId: invoice.id,
                    attemptCount: invoice.attempt_count,
                    eventId: event.id,
                  }),
                },
              });
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
