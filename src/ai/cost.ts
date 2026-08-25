// Volume 5 — AI Cost Accounting
// Conservative per-1M-token estimates. Prices are USD and configurable per model;
// unknown models default to the baseline pricing below (approximate public list price).

import type { ModelUsage } from './model-router';

export interface PriceRow {
  inputPerMillion: number;
  outputPerMillion: number;
}

// Model pricing (per 1M tokens, USD) — updated Aug 2026
export const MODEL_PRICING: Record<string, PriceRow> = {
  // OpenAI
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-4-turbo': { inputPerMillion: 10.0, outputPerMillion: 30.0 },
  // Anthropic
  'claude-3-5-sonnet-20241022': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'claude-3-haiku-20240307': { inputPerMillion: 0.25, outputPerMillion: 1.25 },
  // Groq (fast inference)
  'llama-3.3-70b-versatile': { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  'llama-3.1-8b-instant': { inputPerMillion: 0.05, outputPerMillion: 0.08 },
  // NVIDIA NIM
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