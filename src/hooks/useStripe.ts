// React Query hooks for Stripe subscription management
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SubscriptionStatus } from '@/lib/stripe';

const stripeKeys = {
  subscription: ['stripe', 'subscription'] as const,
};

// Get subscription status
export function useSubscriptionStatus(enabled = true) {
  return useQuery({
    queryKey: stripeKeys.subscription,
    queryFn: async (): Promise<SubscriptionStatus> => {
      const res = await fetch('/api/stripe/subscription');
      const data = await res.json();
      if (!data.success) {
        return {
          subscription: null,
          plan: 'starter',
          usage: { websites: 0, websitesLimit: 1, pagesScanned: 0, pagesLimit: 100 },
          isDemo: true,
        };
      }
      return data.data;
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

// Create subscription
export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stripeKeys.subscription }),
  });
}

// Cancel subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/stripe/subscription', { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: stripeKeys.subscription }),
  });
}

// Check demo mode
export function useIsDemoMode() {
  return !process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || 
         process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID?.includes('demo');
}
