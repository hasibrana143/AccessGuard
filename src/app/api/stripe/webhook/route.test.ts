import { describe, it, expect } from 'vitest';
import { resolvePlanFromMetadata, resolveSubscriptionState } from '@/app/api/stripe/webhook/route';

describe('resolvePlanFromMetadata (Stripe metadata is untrusted strings)', () => {
  it('accepts only canonical plan ids', () => {
    expect(resolvePlanFromMetadata('growth')).toBe('growth');
    expect(resolvePlanFromMetadata('agency')).toBe('agency');
  });

  it('fails closed on garbage, missing, or wrong-typed values', () => {
    expect(resolvePlanFromMetadata('price_1AbC')).toBe('starter');
    expect(resolvePlanFromMetadata('')).toBe('starter');
    expect(resolvePlanFromMetadata(undefined)).toBe('starter');
    expect(resolvePlanFromMetadata(42)).toBe('starter');
    expect(resolvePlanFromMetadata(null)).toBe('starter');
  });
});

describe('resolveSubscriptionState (Stripe status mapping)', () => {
  it('keeps the metadata plan when active', () => {
    expect(resolveSubscriptionState('active', 'growth')).toEqual({
      plan: 'growth',
      subscriptionStatus: 'active',
    });
  });

  it('keeps the plan while trialing — never downgrades a trial', () => {
    expect(resolveSubscriptionState('trialing', 'agency')).toEqual({
      plan: 'agency',
      subscriptionStatus: 'trialing',
    });
  });

  it('keeps the plan on past_due/incomplete/paused', () => {
    expect(resolveSubscriptionState('past_due', 'growth')).toEqual({
      plan: 'growth',
      subscriptionStatus: 'past_due',
    });
    expect(resolveSubscriptionState('incomplete', 'growth')).toEqual({
      plan: 'growth',
      subscriptionStatus: 'incomplete',
    });
    expect(resolveSubscriptionState('paused', 'growth')).toEqual({
      plan: 'growth',
      subscriptionStatus: 'paused',
    });
  });

  it('drops to starter only on terminal states', () => {
    expect(resolveSubscriptionState('canceled', 'agency')).toEqual({
      plan: 'starter',
      subscriptionStatus: 'canceled',
    });
    expect(resolveSubscriptionState('unpaid', 'growth')).toEqual({
      plan: 'starter',
      subscriptionStatus: 'unpaid',
    });
    expect(resolveSubscriptionState('incomplete_expired', 'growth')).toEqual({
      plan: 'starter',
      subscriptionStatus: 'incomplete_expired',
    });
  });

  it('defaults to starter when no metadata plan is present', () => {
    expect(resolveSubscriptionState('active', undefined)).toEqual({
      plan: 'starter',
      subscriptionStatus: 'active',
    });
  });

  it('falls back to starter plan for unknown statuses without downgrading assumptions', () => {
    expect(resolveSubscriptionState('whatever', 'agency')).toEqual({
      plan: 'agency',
      subscriptionStatus: 'whatever',
    });
  });
});
