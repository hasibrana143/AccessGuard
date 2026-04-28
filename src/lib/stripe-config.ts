// AccessGuard Stripe Configuration
// Pricing plans and Stripe configuration for subscription billing

export type PlanId = 'starter' | 'agency' | 'enterprise';

export interface PlanLimits {
  maxWebsites: number;
  maxPages: number;
  maxUsers: number;
  features: string[];
}

export interface PricingPlan {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year' | 'one-time';
  priceId: string; // Stripe Price ID (placeholder for production)
  limits: PlanLimits;
  popular?: boolean;
}

// Placeholder Stripe Price IDs - these should be replaced with actual Price IDs from Stripe Dashboard
// Format: price_xxxxxxxxxxxxxx
export const STRIPE_PRICE_IDS = {
  starter: {
    monthly: 'price_starter_monthly_placeholder',
    yearly: 'price_starter_yearly_placeholder',
  },
  agency: {
    monthly: 'price_agency_monthly_placeholder',
    yearly: 'price_agency_yearly_placeholder',
  },
  enterprise: {
    monthly: 'price_enterprise_monthly_placeholder',
    yearly: 'price_enterprise_yearly_placeholder',
  },
} as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small websites and individual projects',
    price: 49,
    interval: 'month',
    priceId: STRIPE_PRICE_IDS.starter.monthly,
    limits: {
      maxWebsites: 1,
      maxPages: 100,
      maxUsers: 2,
      features: [
        '1 website',
        'Up to 100 pages scanned',
        'Basic WCAG compliance reports',
        'Email support',
        'API access',
      ],
    },
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Ideal for agencies managing multiple client websites',
    price: 199,
    interval: 'month',
    priceId: STRIPE_PRICE_IDS.agency.monthly,
    popular: true,
    limits: {
      maxWebsites: 10,
      maxPages: 1000,
      maxUsers: 10,
      features: [
        'Up to 10 websites',
        'Up to 1,000 pages scanned',
        'Advanced WCAG compliance reports',
        'Priority email support',
        'API access',
        'White-label reports',
        'Custom branding',
      ],
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with custom requirements',
    price: 0, // Custom pricing
    interval: 'month',
    priceId: STRIPE_PRICE_IDS.enterprise.monthly,
    limits: {
      maxWebsites: -1, // Unlimited
      maxPages: -1, // Unlimited
      maxUsers: -1, // Unlimited
      features: [
        'Unlimited websites',
        'Unlimited pages scanned',
        'Enterprise-grade compliance reports',
        '24/7 dedicated support',
        'API access',
        'White-label reports',
        'Custom branding',
        'SSO/SAML authentication',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantees',
      ],
    },
  },
];

/**
 * Get a pricing plan by its ID
 */
export function getPlanById(planId: PlanId): PricingPlan | undefined {
  return PRICING_PLANS.find((plan) => plan.id === planId);
}

/**
 * Get plan limits by plan ID
 */
export function getPlanLimits(planId: PlanId): PlanLimits {
  const plan = getPlanById(planId);
  if (!plan) {
    // Return starter limits as default
    return PRICING_PLANS[0].limits;
  }
  return plan.limits;
}

/**
 * Get the Stripe Price ID for a plan and billing interval
 */
export function getStripePriceId(planId: PlanId, interval: 'month' | 'year' = 'month'): string {
  const priceIds = STRIPE_PRICE_IDS[planId];
  if (!priceIds) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }
  return interval === 'year' ? priceIds.yearly : priceIds.monthly;
}

/**
 * Check if a plan supports a feature
 */
export function planSupportsFeature(planId: PlanId, feature: string): boolean {
  const plan = getPlanById(planId);
  if (!plan) return false;
  return plan.limits.features.some((f) => f.toLowerCase().includes(feature.toLowerCase()));
}

/**
 * Subscription status mapping
 */
export const SUBSCRIPTION_STATUS_MAP = {
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'unpaid',
  trialing: 'trialing',
  incomplete: 'incomplete',
  incomplete_expired: 'incomplete_expired',
  paused: 'paused',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS_MAP)[keyof typeof SUBSCRIPTION_STATUS_MAP];

/**
 * Check if a subscription is active
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Webhook events we handle
 */
export const STRIPE_WEBHOOK_EVENTS = [
  'customer.created',
  'customer.updated',
  'customer.deleted',
  'subscription.created',
  'subscription.updated',
  'subscription.deleted',
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
] as const;

export type StripeWebhookEvent = (typeof STRIPE_WEBHOOK_EVENTS)[number];
