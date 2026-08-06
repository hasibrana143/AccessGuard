# Volume 10 — Pricing Playbook (Execution)

> Complements `docs/product/PRICING_STRATEGY.md` (strategy + shipped numbers). This is the
> experimentation & operational layer for pricing. Shipped truth: Stripe plans
> Starter $49 / Growth $149 / Agency $399 / Enterprise custom; limits enforced in `plan-limits.ts`.

## 1. Current shipped state
| Tier | Price | Websites | Pages/mo | Scan cadence | Key unlocks |
|---|---|---|---|---|---|
| Starter | $49 | 1 | 500 | Weekly | Email reports |
| Growth | $149 (popular) | 5 | 5,000 | Daily | AI remediation, GitHub auto-PR, priority support |
| Agency | $399 | 15 | 25,000 | Daily+ | White-label reports, team seats |
| Enterprise | Custom | Unlimited | Custom | — | SSO/SAML, CSM, SLA |

## 2. Experiment backlog (ordered by ROI)
| # | Experiment | Hypothesis | Effort | Success metric |
|---|---|---|---|---|
| E1 | **Annual toggle** (2 months free) | Annual improves NRR & cash | M (Stripe recurring annual + UI toggle) | 20%+ annual attach |
| E2 | **Trial nudge email at D+7** | Reduce ghosting | S (email infra needed) | +15% trial→paid |
| E3 | **Agency price test $499** | Agency willingness is higher | S (price change) | Conversion flat + revenue ↑ |
| E4 | **Starter page-pack overage** | Scan-heavy $49 users pay more | M (new SKU + enforcement) | 10% of Starter buys pack |
| E5 | **Growth trial credit (5 AI fixes)** | AI demo → upgrade | S (AI key usage cap per trial) | +AI-driven upgrades |
| E6 | **Usage meter on pricing page** | "Sliders" pre-commit bigger plan | S (landing widget) | Fewer downsells |
| E7 | **API access gated by tier** | Dev orgs pay for CI access | S (plan gate on api-key) | New API plan ARPU |

## 3. Pricing operations
- **Changes**: config in `src/lib/stripe.ts` (PRICING_PLANS) + seed data; verify UI/pricing page,
  Stripe products sync, `plan-limits.ts` caps, audit `plan.change` events.
- **Grandfathering**: keep old tier price for existing customers (Stripe per-subscription price);
  new pricing only for new subs. Document each change in this file.
- **Downgrade safety** (already built): limits may only restrict, never raise (enforced in code).
- **Annual billing**: create annual Stripe price IDs (e.g. `price_..._annual`) — monthly ↔ annual
  switch must preserve usage state (week window).

## 4. Compliance pricing notes (legal angle)
- Prices in USD; taxes handled by Stripe (add `invoice_settings.default_tax_rates`).
- Refund policy: 14-day full refund (align with trial messaging); state in `/api/legal/tos`.
- Trial: 14 days, no card required (current UX) — monitor fraud rate on free trials (rate limits
  already cover auth/AI).

## 5. Reporting cadence
| Metric | Formula | Cadence |
|---|---|---|
| MRR | Σ(paid subs × price) | Weekly |
| ARPU | MRR / paid customers | Monthly |
| Trial→paid | paid / trials (30d cohort) | Monthly |
| Expansion MRR | upsells + overage | Monthly |
| Churn | canceled / active | Monthly |
| Blended margin | 1 − (infra + scanner cost / MRR) | Monthly |

## 6. Escalation rules
- Any price change → update: `src/lib/stripe.ts`, `src/data/pricing` (if exists), pricing page,
  this doc + PRICING_STRATEGY, and customer comms (if existing customers affected).