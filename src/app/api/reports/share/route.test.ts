import { describe, it, expect } from 'vitest';
import { clampShareTtlDays, DEFAULT_SHARE_TTL_DAYS, MAX_SHARE_TTL_DAYS } from '@/app/api/reports/share/route';

describe('clampShareTtlDays (PRD UC7 — share link expiry)', () => {
  it('defaults to 30 days when absent', () => {
    expect(clampShareTtlDays(undefined)).toBe(DEFAULT_SHARE_TTL_DAYS);
    expect(clampShareTtlDays(null)).toBe(DEFAULT_SHARE_TTL_DAYS);
    expect(clampShareTtlDays(NaN)).toBe(DEFAULT_SHARE_TTL_DAYS);
  });

  it('clamps below minimum to 1 day', () => {
    expect(clampShareTtlDays(0)).toBe(1);
    expect(clampShareTtlDays(-5)).toBe(1);
  });

  it('clamps above maximum to 365 days', () => {
    expect(clampShareTtlDays(9999)).toBe(MAX_SHARE_TTL_DAYS);
    expect(clampShareTtlDays(500)).toBe(365);
  });

  it('keeps in-range values', () => {
    expect(clampShareTtlDays(7)).toBe(7);
    expect(clampShareTtlDays(30)).toBe(30);
    expect(clampShareTtlDays(365)).toBe(365);
  });

  it('truncates decimals', () => {
    expect(clampShareTtlDays(14.9)).toBe(14);
  });

  it('rejects non-finite types (falls back to default)', () => {
    expect(clampShareTtlDays('90')).toBe(DEFAULT_SHARE_TTL_DAYS);
    expect(clampShareTtlDays({})).toBe(DEFAULT_SHARE_TTL_DAYS);
    expect(clampShareTtlDays(Infinity)).toBe(DEFAULT_SHARE_TTL_DAYS);
  });
});