# Product Research — AccessGuard

> Status: Draft v1 (2026-08) · Owner: Product · Grounding: codebase features, COMPETITIVE_ANALYSIS.md, PRD.md

## 1. Problem Statement

Websites that fail WCAG 2.1/2.2 AA accessibility standards expose their owners to ADA Title III
lawsuits (US), EAA enforcement (EU), Section 508 obligations (US government), and lost revenue
from ~1.3B people with disabilities who can't use the site.

Manual accessibility audits cost $5k–$50k+ per engagement and go stale the moment code changes.
Existing automated tools either:
- **Over-promise** ("instant AI compliance") with overlay technology that is legally and technically contested, or
- **Under-deliver** (raw axe-core output) with no remediation path — developers get violation lists, not fixes.

## 2. Validated Core Insight

> Companies don't buy "scans". They buy **defensible compliance** (audit trail + continuous monitoring) and **fewer engineering hours spent fixing issues**.

AccessGuard's wedge: **scan → detect → AI-remediate → GitHub auto-PR → monitor continuously** in one loop, with evidence (reports, audit logs, PR history) that holds up in court and in procurement.

## 3. What Was Built (2026) — Feature Ground Truth

| Area | Delivered |
|---|---|
| Scanning | Playwright/Chromium + axe-core (WCAG 2.1/2.2 AA), HTML/fetch analysis strategy, 100+ pages/site crawl with configurable crawl settings |
| Detection | Severity model (critical/serious/moderate/minor), WCAG criteria mapping, per-rule remediation guidance |
| AI remediation | Per-violation AI explanation + confidence score, validateFixForRule guardrails, suggested code fixes |
| GitHub | Connect org repos, open auto-PRs from violations, PR status checks on scan results |
| Monitoring | Scheduled scans (cron/daily/weekly/monthly via scheduler daemon), risk score, trend charts, dashboard stats |
| Reporting | PDF + shareable-link compliance reports, white-label (Agency tier) |
| Team & security | Roles (owner/admin/member/viewer + custom roles), MFA, audit logs, org scoping, rate limiting, SSRF/XSS/CSV-injection hardening |
| Billing | Stripe subscriptions, 4 tiers, plan-limit enforcement (websites, pages/month) |
| Ops | BullMQ queue, Redis, structured logging (Pino), Sentry, OpenAPI docs |

## 4. Validation Signals (to run / in progress)

- [ ] 10 founder interviews (target: agencies + funded startups)
- [ ] 5 "cheap signal" landing-page tests (value prop A vs B)
- [ ] Pilot: 3 agencies × 5 client sites each (measure: time-to-first-fix)
- [ ] Legal review of report output as evidence artifact

## 5. Key Open Questions

1. Overlay competitors (accessiBe/UserWay) — do we position as "anti-overlay" or ignore?
2. Do buyers want us to *host* remediation (their repo) or only suggest changes?
3. Enterprise: SSO/SAML + custom integrations are table stakes — build order vs partners?

## 6. Feature Priorities (RICE, 1–5)

| Feature | Reach | Impact | Confidence | Effort | RICE | Phase |
|---|---|---|---|---|---|---|
| GitHub auto-PR | 4 | 4 | 0.8 | 3 | 4.3 | Done |
| Scheduled scans + risk trends | 5 | 4 | 0.9 | 2 | 9.0 | Done |
| PDF + shareable reports | 4 | 4 | 0.8 | 2 | 6.4 | Done |
| AI remediation suggestions | 4 | 5 | 0.6 | 4 | 3.0 | Done (v1) |
| White-label (agency) | 3 | 4 | 0.7 | 3 | 2.8 | Done |
| SSO/SAML | 3 | 5 | 0.9 | 5 | 2.7 | Next |
| API/CI pipeline integration | 4 | 4 | 0.8 | 3 | 4.3 | Next |
| Role-based custom permissions | 3 | 3 | 0.8 | 2 | 3.6 | Done |

RICE = (Reach × Impact × Confidence) / Effort.
