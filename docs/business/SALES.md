# Volume 10 — Sales Playbook

> Grounding: product is live with self-serve Stripe (4 tiers), plan limits enforced server-side
> (`plan-limits.ts`), GitHub auto-PR, AI remediation. This doc is the go-to-market playbook on top.

## 1. Sales motion by segment

| Segment | Motion | Channel | Owner |
|---|---|---|---|
| **Solo site owners / devs** (Starter $49) | Product-led, zero-touch | Trial → weekly evidence emails → checkout | Automation |
| **Funded SaaS / multi-site dev orgs** (Growth $149) | Product-led + light assist | Trial + GitHub auto-PR visibility + usage-based upgrade prompt | CS on request |
| **Agencies** (Agency $399) | Sales-assisted, white-label pitch | Outreach: portfolio of client sites with WCAG exposure | Founder/CSM |
| **Enterprise / regulated orgs** (Custom) | Full sales cycle | Contact sales → audit → POC → security review (SOC2/GDPR docs ready) | Founder |

## 2. The core conversion moment
- **Funnel**: signup → verify email → create project → first scan (<5 min) → violation list →
  **risk score + lawsuit framing** → paywall moment.
- **The "receipt"**: weekly scan evidence email = the recurring reminder of legal exposure.
- **Trigger email sequence** (roadmap, needs email infra wiring):
  1. D+0: first scan done + top 5 critical violations preview.
  2. D+3: "Your site fails N WCAG rules — what that means for ADA lawsuits".
  3. D+7: Agency/enterprise pitch if >3 sites added.
  4. D+13: trial ending + offer.

## 3. Sales toolkit (what's built vs needed)
| Tool | Status |
|---|---|
| Shared public report links (`/share/[token]`) — demo evidence | ✅ built |
| Audit logs (compliance story) | ✅ built |
| GDPR/SOC2 readiness docs | ✅ docs (`docs/security/`) |
| Usage analytics per org (`/api/stats/usage`) | ✅ built |
| White-label reports (Agency tier) | 🚧 partial — branding toggle roadmap |
| CRM (HubSpot/Attio) | ❌ not started — use a simple sheet until 20 customers |
| Proposal/POC template | ❌ not started |

## 4. Enterprise sales process (7 steps)
1. **Qualify** — triggered when trial adds 3+ sites or requests SSO/SAML (page: "Contact sales").
2. **Audit demo** — real scan of their own site, real report link (share URL).
3. **Security review** — hand over `docs/security/*` (auth, RBAC, encryption, OWASP, SOC2/GDPR readiness).
4. **Pilot (2 weeks)** — 1–2 sites, daily scans; weekly evidence email cadence.
5. **Quote** — annual contract; custom page caps; CSM; SLA (draft SLOs in `docs/devops/MONITORING.md`).
6. **Procurement** — invoice + legal review (terms in `/api/legal/tos`, privacy `/api/legal/privacy`).
7. **Onboard** — dev guide + admin guide; custom role setup; audit-log review workflow.

## 5. Quotas, benchmarks & KPIs
| Metric | Self-serve target | Agency target |
|---|---|---|
| Trial → paid | 8–12% | 15–20% |
| Time-to-first-scan | < 5 min | — |
| Payback period | < 8 months | < 6 months |
| MRR per customer (blend) | $120 | $450 |
| Net revenue retention | 105%+ | 115%+ |

## 6. Objection handling
| Objection | Response |
|---|---|
| "We use axe/pa11y free" | Those are tools, not compliance evidence — no history, no reports, no org audit trail, no auto-PR. |
| "Is it legally valid evidence?" | Reports include scan metadata + timestamps + audit trail (evidentiary chain); SOC2 readiness ongoing. |
| "AI fixes will break our code" | Confidence-gated (≥0.7 auto-PR), template fallback, PR preview before merge. |
| "Price" | Compliance contracts stick; a single ADA lawsuit costs $10k–75k to defend. |

## 7. First 30 customers plan
- 10 via Product Hunt launch (see PRODUCT_HUNT.md) + content SEO.
- 10 via GitHub auto-PR visibility (viral dev channel).
- 5 via agency outreach (white-label pitch).
- 5 via web accessibility meetups/local communities.