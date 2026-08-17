import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { PRICING_PLANS, type PlanType } from '@/lib/stripe';
import { sendDunningEmail } from '@/lib/email';

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
  try {
    await tx.webhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (error) {
    // Concurrent duplicate delivery: the PK insert lost the race — treat as handled.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }
    throw error;
  }
  return true;
}

// True only when the event's subscription is the org's current one (or the org
// has no recorded subscription yet). Guards late-delivered events from a
// superseded subscription clobbering a newer subscription's state.
function isCurrentSubscription(
  recordedSubscriptionId: string | null,
  eventSubscriptionId: string
): boolean {
  return recordedSubscriptionId === null || recordedSubscriptionId === eventSubscriptionId;
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

        // Only subscription-mode checkouts carry a subscription id; skip the rest.
        if (
          session.mode !== 'subscription' ||
          typeof session.subscription !== 'string' ||
          !orgId
        ) {
          break;
        }

        const plan = resolvePlanFromMetadata(session.metadata?.plan);
        const subscriptionId = session.subscription;

        await db.$transaction(async (tx) => {
          if (!(await claimEvent(tx, event))) return;
          const existing = await tx.organization.findUnique({
            where: { id: orgId },
            select: { settings: true },
          });
          if (!existing) {
            // Org deleted while the subscription is still live — consume the
            // event so Stripe stops retrying, but skip the mutation.
            logger.warn(`Checkout completed for missing org ${orgId}`);
            return;
          }
          const existingSettings = existing.settings ? JSON.parse(existing.settings) : {};
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
              action: 'subscription.created',
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
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const orgId = subscription.metadata?.orgId;

        if (orgId) {
          const hasPlan = typeof subscription.metadata?.plan === 'string' && PLAN_IDS.has(subscription.metadata.plan);
          // Subscription metadata can go stale across in-subscription price
          // changes — the item price is the source of truth for the updated
          // event; fall back to metadata (gated), then the org's current plan.
          const pricePlan = PRICING_PLANS.find(
            (p) => p.priceId === subscription.items.data[0]?.price.id
          )?.id as PlanType | undefined;

          await db.$transaction(async (tx) => {
            if (!(await claimEvent(tx, event))) return;
            const org = await tx.organization.findUnique({
              where: { id: orgId },
              select: { plan: true, stripeSubscriptionId: true },
            });
            if (!org) {
              logger.warn(`Subscription updated for missing org ${orgId}`);
              return;
            }
            if (!isCurrentSubscription(org.stripeSubscriptionId, subscription.id)) {
              logger.warn(
                `Stale subscription.updated for org ${orgId}: event sub ${subscription.id} != current ${org.stripeSubscriptionId}`
              );
              return;
            }
            const { plan, subscriptionStatus } = resolveSubscriptionState(
              subscription.status,
              pricePlan ??
                (hasPlan
                  ? (subscription.metadata!.plan as PlanType)
                  : ((org.plan as PlanType) ?? 'starter'))
            );
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
            const org = await tx.organization.findUnique({
              where: { id: orgId },
              select: { stripeSubscriptionId: true },
            });
            if (!org) {
              logger.warn(`Subscription deleted for missing org ${orgId}`);
              return;
            }
            if (!isCurrentSubscription(org.stripeSubscriptionId, subscription.id)) {
              logger.warn(
                `Stale subscription.deleted for org ${orgId}: event sub ${subscription.id} != current ${org.stripeSubscriptionId}`
              );
              return;
            }
            await tx.organization.update({
              where: { id: orgId },
              data: { plan: 'starter', subscriptionStatus: 'canceled', stripeSubscriptionId: null },
            });
            await tx.auditLog.create({
              data: {
                orgId,
                action: 'subscription.cancelled',
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
              const org = await tx.organization.findUnique({
                where: { id: orgId },
                select: { id: true },
              });
              if (!org) {
                logger.warn(`Payment succeeded for missing org ${orgId}`);
                return;
              }
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
            const org = await db.organization.findUnique({
              where: { id: orgId },
              select: { id: true, name: true, settings: true },
            });
            if (org) {
              await db.$transaction(async (tx) => {
                if (!(await claimEvent(tx, event))) return;
                const orgInTx = await tx.organization.findUnique({
                  where: { id: orgId },
                  select: { id: true },
                });
                if (!orgInTx) {
                  logger.warn(`Payment failed for missing org ${orgId}`);
                  return;
                }
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

              // Send dunning email to org users
              try {
                const settings = org.settings ? JSON.parse(org.settings) : {};
                const invoiceUrl = invoice.hosted_invoice_url || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`;
                const nextRetryDate = invoice.next_payment_attempt
                  ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
                  : undefined;
                const users = await db.user.findMany({
                  where: { orgId },
                  select: { email: true, name: true },
                });
                const emails = [...new Set(users.map(u => u.email))].slice(0, 5);
                for (const email of emails) {
                  await sendDunningEmail(email, org.name, invoiceUrl, invoice.attempt_count, nextRetryDate);
                }
              } catch (emailErr) {
                logger.error({ err: emailErr, orgId }, 'Failed to send dunning email');
              }

              logger.info(`Payment failed for org ${orgId}`);
            }
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
