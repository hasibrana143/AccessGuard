# Volume 10 — Investor Deck

> Grounding: every number here is from verified repo facts (docs/product/*, docs/engineering/*,
> live code). For founder pitches (pre-seed / seed).

## Deck structure (12 slides)

### 1. Title
AccessGuard — Automated WCAG compliance, AI remediation, and GitHub auto-PR.
*"Your accessibility scanner that writes the pull request."*

### 2. Problem
- WCAG/ADA compliance is a **legal liability**: an ADA website lawsuit costs $10k–75k to defend;
  filings keep rising YoY.
- Existing options: free OSS tools (axe, pa11y, Lighthouse) = no evidence trail, no org controls;
  enterprise suites = $30k+/yr, manual onboarding, no dev workflow.
- Companies can't answer: *"Is our site compliant — and can you prove it?"*

### 3. Solution
- Automated scanning (Puppeteer + axe-core + fetch/dom analysis) → severity-classified violations.
- **AI remediation** (LLM-generated fixes, confidence-gated) + **GitHub auto-PR**.
- Compliance-grade evidence: timestamped reports, share links, full audit trail.

### 4. Market (see TAM_SAM_SOM)
- TAM: accessibility compliance software ~$600M+; SAM: SMB SaaS + agencies in WCAG-regulated
  markets; SOM (Y3): ~$2–5M ARR if 300–600 customers at $400 ARPU.

### 5. Product (demo)
- Live: signup → first scan < 5 min → violations + risk score (formula: 100 − 10c − 5s − 2m − 1mn).
- AI fix with confidence, template fallback when LLM unavailable (never blocks).
- Reports + public share links; scheduled scans; usage analytics.

### 6. Traction / build state
- Working product: 63 API routes, 13 DB models, scanner + AI + Stripe + GitHub integration, live CI.
- 234 unit tests green, 80 e2e tests, lint 0, typecheck clean.
- Security hardening shipped (fail-closed auth, RBAC matrix, audit events, security headers).
- Docs: 12-volume system, ~60+ reference docs.

### 7. Business model (see BUSINESS_MODEL)
- 4-tier SaaS: $49 / $149 / $399 / custom; usage-capped (server-enforced).
- Expansion: agency white-label, page packs, API/CI monetization.
- Target gross margin 85%+; CAC $60–120 self-serve.

### 8. GTM (see SALES/MARKETING/SEO)
- Product-led: trial → weekly evidence email → paywall moment.
- Viral loop: GitHub auto-PR surfaces product inside dev orgs.
- Agency white-label loop + SEO content engine (12 pillar articles).
- PH launch planned (V12).

### 9. Competitive landscape
| Player | Positioning | Gap we exploit |
|---|---|---|
| axe/pa11y/Lighthouse | Free OSS | No evidence trail, no org, no PRs, no AI |
| Overlay/audit vendors | $30–100/mo audits | No continuous monitoring, no AI fixes |
| Enterprise suites | $30k+/yr | SMB price, dev-native |

### 10. Team
- (Fill): founder(s) — builder-led; shipped V1–V9 solo across product/design/eng/security/ops.

### 11. Financial plan (Y1–Y3)
| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Customers | 160 | 550 | 1,200 |
| ARR | $250k | $1.2M | $3M |
| Headcount | 4 | 8 | 14 |
| Burn | $30k/mo | $80k/mo | $150k/mo |

### 12. Ask
- **Pre-seed**: $500k for 18 months runway (product 2x + first 20 customers + enterprise motion).
- **Seed (if later)**: $1.5–2M — team, PLG scaling, enterprise sales.

## Appendix facts (verifiable)
- 13 Prisma models · 2 migrations · ~63 API handlers · 48 UI components · 234 vitest / 80 e2e.
- AI: llama-3.3-70b via NVIDIA NIM (OpenAI-compatible), template fallback, cost-tracked audit events.
- GitHub: OAuth user-token PR pipeline, encrypted.
- Security: fail-closed OAuth state, RBAC 14 permissions, audit whitelist, headers, GDPR/SOC2 readiness docs.