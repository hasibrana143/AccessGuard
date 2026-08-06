# Volume 5 — AI Cost Optimization

## 1. Cost model (implemented)

`src/ai/cost.ts` — per-1M-token USD estimates (configurable price table):

| Model | Input /1M | Output /1M |
| --- | --- | --- |
| `meta/llama-3.3-70b-instruct` (default) | $0.13 | $0.40 |
| `meta/llama-3.1-8b-instruct` (cheap) | $0.018 | $0.018 |
| unknown models | $0.13 / $0.40 baseline (`estimate: true`) |

`estimateCost(model, usage)` → `{ inputTokens, outputTokens, totalTokens, costUsd, estimate }`;
`null` when the provider omits usage.

## 2. Capture (implemented)

- **Per call**: `/api/remediate` writes an audit event `remediation.ai_cost` with
  violationId, model, token counts, costUsd, `estimate` flag.
- **Per batch**: `/api/remediate/batch` aggregates llmCalls, tokens, costUsd, models → one event.
- Audit events are org-scoped → cost per org can be derived via audit log exports.

## 3. Levers for optimization

| Lever | State |
| --- | --- |
| Cheap default model | configurable (`AI_MODEL`) — keep the 70B only where quality matters |
| Model routing + fallback | implemented (MODEL_ROUTING) — fallback only on failure |
| Template fallback (no cost) | implemented — 0.5 confidence, avoids every-call-LLM for trivial fixes |
| Caching (`forceRegenerate=false`) | implemented — regenerations cost nothing |
| Batch processing | implemented — same prompt cost structure, fewer round-trips |
| Token budget (`max_tokens: 1000`) | implemented |

## 4. Roadmap (V11 metrics)
- Per-org monthly AI budget (hard cap in `plan-limits`), usage surfaced in `/api/stats/usage`.
- Cost-per-fix KPI on dashboard (data already in audit events).
- Cheapest-capable routing: primary cheap → escalate on low confidence, not only on failure.

## 5. Tests
`src/ai/__tests__/cost.test.ts` — known-model math (0.53 for 1M+1M), unknown baseline, null usage, formatting.