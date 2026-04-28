// Stripe API Service for AccessGuard
import type { ApiResponse } from '@/types';

const API_BASE = '/api/stripe';

// Subscription plan types
export type PlanType = 'starter' | 'agency' | 'enterprise';

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

// Predefined pricing plans
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 'price_starter_demo',
    period: 'month',
    description: 'Perfect for small websites and personal projects',
    features: [
      '1 website',
      '100 pages/month',
      'Basic WCAG scanning',
      'Email reports',
      'API access',
      'Community support'
    ],
    cta: 'Start Free Trial',
    popular: false,
    limits: {
      websites: 1,
      pagesPerMonth: 100
    }
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 199,
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID || 'price_agency_demo',
    period: 'month',
    description: 'For agencies managing multiple client websites',
    features: [
      '10 websites',
      '1,000 pages/month',
      'AI remediation code',
      'GitHub integration',
      'White-label reports',
      'Priority support',
      'Client management',
      'Custom branding'
    ],
    cta: 'Start Free Trial',
    popular: true,
    limits: {
      websites: 10,
      pagesPerMonth: 1000
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    priceId: undefined,
    period: 'custom',
    description: 'For large organizations with custom needs',
    features: [
      'Unlimited websites',
      'Custom page limits',
      'CI/CD integration',
      'Dedicated account manager',
      'SLA guarantee',
      'On-premise option',
      'SSO/SAML',
      'Custom integrations'
    ],
    cta: 'Contact Sales',
    popular: false,
    limits: {
      websites: -1, // Unlimited
      pagesPerMonth: -1 // Unlimited
    }
  }
];

export interface Customer {
  id: string;
  email: string;
  name?: string;
  stripeCustomerId: string;
}

export interface Subscription {
  id: string;
  stripeSubscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  plan: PlanType;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
}

export interface SubscriptionStatus {
  subscription: Subscription | null;
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

export interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending' | 'refunded';
  invoiceUrl?: string;
  invoicePdf?: string;
}

class StripeService {
  private async fetch<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Request failed' };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Create a Stripe customer
  async createCustomer(data: { email: string; name?: string }): Promise<ApiResponse<Customer>> {
    return this.fetch<Customer>(`${API_BASE}/customer`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Create a subscription
  async createSubscription(priceId: string): Promise<ApiResponse<Subscription>> {
    return this.fetch<Subscription>(`${API_BASE}/subscription`, {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
  }

  // Cancel subscription
  async cancelSubscription(): Promise<ApiResponse<Subscription>> {
    return this.fetch<Subscription>(`${API_BASE}/subscription`, {
      method: 'DELETE',
    });
  }

  // Get subscription status
  async getSubscriptionStatus(): Promise<ApiResponse<SubscriptionStatus>> {
    return this.fetch<SubscriptionStatus>(`${API_BASE}/subscription`);
  }

  // Get billing history
  async getBillingHistory(): Promise<ApiResponse<BillingHistory[]>> {
    return this.fetch<BillingHistory[]>(`${API_BASE}/billing-history`);
  }

  // Create checkout session (for payment page)
  async createCheckoutSession(priceId: string): Promise<ApiResponse<{ url: string }>> {
    return this.fetch<{ url: string }>(`${API_BASE}/checkout`, {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
  }

  // Create portal session (for managing payment methods)
  async createPortalSession(): Promise<ApiResponse<{ url: string }>> {
    return this.fetch<{ url: string }>(`${API_BASE}/portal`, {
      method: 'POST',
    });
  }

  // Check if we're in demo mode (no Stripe keys configured)
  isDemoMode(): boolean {
    // If the public price IDs contain "demo", we're in demo mode
    const starterPriceId = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID;
    return !starterPriceId || starterPriceId.includes('demo');
  }
}

export const stripeService = new StripeService();
