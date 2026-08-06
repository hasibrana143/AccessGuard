# Volume 12 — Beta Plan

> Purpose: structured beta before public launch, based on verified build state (V1–V11 complete,
> 234 unit + 80 e2e tests, 63 API routes, live Stripe pipeline).

## 1. Beta phases
| Phase | Cohort | Size | Window | Gate to next |
|---|---|---|---|---|
| **Alpha (internal)** | Team account, seeded orgs | 2–3 | 2 weeks | Scanner + AI stable on test sites |
| **Closed beta** | Invited devs/agencies (waitlist) | 10–20 orgs | 3–4 weeks | Signup→scan→report loop < 1 bug SEV-2/week |
| **Open beta** | Public waitlist | 50–100 orgs | 4–6 weeks | Trial→paid ≥ 5%; loan error rate < 0.1% |
| **GA** | Product Hunt launch (V12) | — | — | PH launch + paid funnel live |

## 2. Beta entry criteria (code-grounded)
- [x] Signup → email verify → first scan < 5 min (smoke e2e covers)
- [x] Scanner: axe-core + fetch/dom fallback working
- [x] AI remediation with template fallback (never blocks)
- [x] Reports + share links public
- [x] GitHub OAuth connect + PR creation
- [x] Stripe checkout (test mode) + coupons + invoices
- [x] Feature flags kill-switches (scanner, AI, billing)
- [x] SLOs measured (V7 stack: at least uptime + error monitoring)
- [x] Backup script automated (daily) + monthly restore drill
- [x] Security: fail-closed auth, RBAC, audit logs, headers
- [ ] PostHog product analytics (roadmap V11) — nice-to-have before GA
- [ ] Sentry release tagging — nice-to-have

## 3. Beta enrollment flow
1. Landing → waitlist form (email capture; no backend yet — roadmap: add waitlist API or use PostHog).
2. Batch invites weekly; each invite → `/auth/register` with org creation.
3. Onboarding: first project auto-created from sample URL to demo instantly.
4. Beta tag in code: flag `experimental.*`; feedback via in-app notifications + support email.

## 4. Beta metrics & gates (per cohort)
| Metric | Gate | Red flag |
|---|---|---|
| Activation (signup → scan < 24h) | ≥ 70% | < 50% — fix onboarding |
| Scan success rate | ≥ 95% | < 85% — scanner regression |
| Median time-to-first-report | < 48h | low engagement — nudge emails |
| Weekly returning orgs | ≥ 60% | < 40% — churn risk |
| SEV-1/2 incidents | 0 | any → pause cohort growth |
| Support tickets/org/week | ≤ 0.5 | > 2 — docs/support gap |

## 5. Beta feedback workflow
1. In-app bug report → GitHub issue (seeded with scan id/org id/timestamp).
2. Weekly feedback session with top 5 active betas.
3. Feature requests → ROADMAP priority board.
4. NPS survey (monthly) — beta cohort.

## 6. Beta exit criteria
- All Phase-3 metrics met for 2 consecutive weeks.
- Postmortem: no open SEV-1/2; SEV-3 < 5.
- Reference: 3+ public testimonials (agencies especially).
- Pricing validated (trial→paid ≥ 5% on beta; launch discount defined).

## 7. Launch-day infra readiness (final)
- docker.yml GHCR image + `latest` ready; rollout automation (RB01).
- `/api/health` monitor active; status page (or simple uptime HTML).
- Backup automated + offsite (V7 BACKUPS roadmap).
- Rate limits tuned to survive PH traffic spike.
- Launch discount code (`LAUNCH40`, V10 PRODUCT_HUNT) tested in Stripe.