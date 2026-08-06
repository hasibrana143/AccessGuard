import { describe, it, expect } from 'vitest';
import { estimateCost, formatCostUsd, getPrice, MODEL_PRICING } from '@/ai/cost';

describe('ai/cost', () => {
  it('returns null when usage is missing', () => {
    expect(estimateCost('meta/llama-3.3-70b-instruct', null)).toBeNull();
  });

  it('computes cost from usage for a known model', () => {
    const cost = estimateCost('meta/llama-3.3-70b-instruct', {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      totalTokens: 2_000_000,
    });
    expect(cost?.costUsd).toBe(0.53); // 0.13 + 0.40
    expect(cost?.estimate).toBe(false);
  });

  it('flags unknown models as estimates using the baseline price', () => {
    const cost = estimateCost('some/custom-model', {
      promptTokens: 500_000,
      completionTokens: 500_000,
      totalTokens: 1_000_000,
    });
    expect(cost?.estimate).toBe(true);
    expect(cost?.costUsd).toBeCloseTo(0.265, 6);
  });

  it('returns the baseline pricing for unknown models', () => {
    const price = getPrice('anything/unknown');
    expect(price).toEqual({ inputPerMillion: 0.13, outputPerMillion: 0.4 });
  });

  it('supports an explicit cheap model row', () => {
    expect(MODEL_PRICING['meta/llama-3.1-8b-instruct']).toBeDefined();
  });

  it('formats cost as a stable USD string', () => {
    expect(formatCostUsd(0.000123456)).toBe('$0.000123');
  });
});