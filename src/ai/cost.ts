// Volume 5 — AI Cost Accounting
// Conservative per-1M-token estimates. Prices are USD and configurable per model;
// unknown models default to the baseline pricing below (approximate public list price).

import type { ModelUsage } from './model-router';

export interface PriceRow {
  inputPerMillion: number;
  outputPerMillion: number;
}

// Baseline: meta/llama-3.3-70b-instruct (~$0.13 / $0.40 per 1M tokens, USD).
export const MODEL_PRICING: Record<string, PriceRow> = {
  'meta/llama-3.3-70b-instruct': { inputPerMillion: 0.13, outputPerMillion: 0.4 },
  'meta/llama-3.1-8b-instruct': { inputPerMillion: 0.018, outputPerMillion: 0.018 },
};

export function getPrice(model: string): PriceRow {
  return MODEL_PRICING[model] || { inputPerMillion: 0.13, outputPerMillion: 0.4 };
}

export interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  estimate: boolean;
}

export function estimateCost(model: string, usage: ModelUsage | null): CostEstimate | null {
  if (!usage) return null;

  const price = getPrice(model);
  const inputTokens = usage.promptTokens;
  const outputTokens = usage.completionTokens;

  const costUsd =
    (inputTokens / 1_000_000) * price.inputPerMillion +
    (outputTokens / 1_000_000) * price.outputPerMillion;

  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
    estimate: !MODEL_PRICING[model],
  };
}

export function formatCostUsd(costUsd: number): string {
  return `$${costUsd.toFixed(6)}`;
}