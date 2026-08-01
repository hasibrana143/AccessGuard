// Stripe configuration and service for AccessGuard
import Stripe from 'stripe';

export type PlanType = 'starter' | 'growth' | 'agency' | 'enterprise';

export interface PricingPlan {
  id: PlanType;
  name: string;
  price: number | null;
  priceId?: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
  limits: {
    websites: number;
    pagesPerMonth: number;
  };
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_starter_demo',
    period: 'month',
    description: 'Perfect for small websites',
    features: ['1 website', '500 pages/month', 'Weekly scans', 'Email reports', 'Community support'],
    cta: 'Start Free Trial',
    popular: false,
    limits: { websites: 1, pagesPerMonth: 500 },
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    priceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || 'price_growth_demo',
    period: 'month',
    description: 'For growing teams and agencies',
    features: ['5 websites', '5,000 pages/month', 'Daily scans', 'AI remediation', 'GitHub auto-PR', 'Priority support'],
    cta: 'Start Free Trial',
    popular: true,
    limits: { websites: 5, pagesPerMonth: 5000 },
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 399,
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID || 'price_agency_demo',
    period: 'month',
    description: 'For digital agencies managing clients',
    features: ['15 websites', '25,000 pages/month', 'White-label reports', 'Team seats', 'GitHub auto-PR', 'Dedicated support'],
    cta: 'Start Free Trial',
    popular: false,
    limits: { websites: 15, pagesPerMonth: 25000 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: 'custom',
    description: 'For large organizations',
    features: ['Unlimited websites', 'Custom page limits', 'SSO/SAML', 'Dedicated CSM', 'Custom integrations', 'SLA'],
    cta: 'Contact Sales',
    popular: false,
    limits: { websites: -1, pagesPerMonth: -1 },
  },
];

export interface SubscriptionStatus {
  subscription: {
    id: string;
    status: string;
    plan: PlanType;
    currentPeriodEnd: string;
  } | null;
  plan: PlanType;
  usage: {
    websites: number;
    websitesLimit: number;
    pagesScanned: number;
    pagesLimit: number;
    periodStart: string;
    periodEnd: string;
  };
  isDemo: boolean;
}

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Get Stripe client (only if configured)
export function getStripeClient(): Stripe | null {
  if (!isStripeConfigured()) return null;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripe;
}

// Create customer
export async function createCustomer(email: string, name?: string): Promise<Stripe.Customer | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;
  return stripe.customers.create({ email, name });
}

// Create subscription
export async function createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  });
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;
  return stripe.subscriptions.cancel(subscriptionId);
}

// Get subscription
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Construct webhook event
export function constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event | null {
  const stripe = getStripeClient();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return null;
  try {
    return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return null;
  }
}

// Reactivate a canceled subscription
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;
  try {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  } catch {
    return null;
  }
}

// Get Stripe price ID for a plan
export function getStripePriceId(planId: PlanType): string {
  const plan = PRICING_PLANS.find(p => p.id === planId);
  return plan?.priceId || '';
}

// Get plan from price ID
export function getPlanFromPriceId(priceId: string): PlanType {
  const plan = PRICING_PLANS.find(p => p.priceId === priceId);
  return plan?.id || 'starter';
}
