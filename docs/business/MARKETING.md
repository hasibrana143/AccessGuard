# Volume 10 — Marketing & Growth

> Grounding: product-led motion; pricing per PRICING_STRATEGY ($49/$149/$399/custom); four growth
> loops documented in BUSINESS_MODEL (trial, agency, GitHub, content). This is the execution layer.

## 1. Positioning (one-liners)
- **For**: devs & compliance leads at SMB SaaS + agencies with client websites.
- **Problem**: WCAG/ADA compliance is a legal liability — lawsuits, RFPs, accessibility audits cost $10k+.
- **Product**: automated WCAG scanning + AI remediation + GitHub auto-PR + compliance reports.
- **Differentiator**: dev-native (auto-PR, CI-ready API), compliance-grade evidence (audit trail, reports).

## 2. Channels (ranked by ROI)

| Channel | Effort | Expected result | Start |
|---|---|---|---|
| **Product Hunt launch** | 1 week | 300–800 visits, 15–40 signups | V12 launch |
| **SEO content** (see SEO.md) | ongoing | 1k–5k/mo organic after 6 mo | now |
| **GitHub viral loop** | code already | auto-PR surfaces product in dev orgs | live |
| **Agency outreach** | 1:1 | 5–10 agency pilots | month 1 |
| **Communities** (r/accessibility, HN, web.dev Slack) | weekly | credibility + trial users | now |
| **Paid** (Google Ads "wcag compliance tool") | budget | defer until PMF signal | month 3 |

## 3. Content engine (compliance angle)
Pillar topics (each → 1 long-form + 3 short-form):
1. "WCAG 2.1 vs 2.2 for SaaS" (regulatory timeliness — updated 2026)
2. "ADA lawsuit data 2026: what a first violation costs"
3. "Axe-core vs paid scanners — the evidence gap"
4. "AI remediation: what you can safely auto-fix"
5. "Agency white-label accessibility reports"
- Formats: blog, email teasers, GitHub README badge, LinkedIn (agencies), Twitter/X (devs).
- Repurpose scan reports with permission → case studies ("before/after risk score").

## 4. Growth loops (operationalised)

### Loop A — Trial → Evidence
```
signup → first scan → risk score email (D+1) → weekly evidence → paywall moment → paid
```
### Loop B — GitHub auto-PR
```
dev connects repo → scan finds violations → PR with fix → repo activity → new devs discover → trial
```
### Loop C — Agency white-label
```
agency runs client scans → white-label report → agency invoices client → agency upgrades → more scans
```
### Loop D — SEO content
```
article ranks → trial signup → scan → report shared (public /share link) → backlink → ranking ↑
```

## 5. Funnel instrumentation (what exists)
| Stage | Instrument |
|---|---|
| Signup | `User` rows, auth events in audit log |
| First scan | `Scan` rows (status/rule breakdown) |
| Activation (2+ scans / report gen) | `Scan` + `ComplianceReport` |
| Upgrade/payment | `stripe.*` API + subscription rows |
| Churn | subscription cancel webhook |
- **Gap**: no product analytics SDK (PostHog/GA4). Roadmap: add PostHog (V11 ops/analytics).

## 6. Launch assets checklist
- [ ] Landing page (live) with pricing anchors
- [ ] `docs/runbooks/USER_GUIDE.md` → public help docs page
- [ ] 3 case studies (pilot users)
- [ ] Social cards / OG images (design tokens exist)
- [ ] Changelog page (roadmap)

## 7. Monthly growth KPIs
| KPI | Month 1 | Month 6 | Year 1 |
|---|---|---|---|
| Organic visitors | 500 | 3,000 | 8,000 |
| Signups | 60 | 400 | 1,200 |
| Trial→paid | 8% | 10% | 12% |
| MRR | $800 | $8k | $25k |
| Paid customers | 8 | 55 | 160 |