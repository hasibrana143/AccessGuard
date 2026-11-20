# AccessGuard — Product Critique & Strategy (A→Z)

**Date:** 2026-11-20
**Method:** Code-verified claims + market/legal research (sources at bottom)
**Scope:** Is the idea right? Is it built right? What is missing? What to do next?
**Lens:** Buyer, unit economics, legal defensibility, engineering reality. Not cheerleading.

---

## 0. Verdict

| Dimension | Verdict | One line |
|---|---|---|
| Market & timing | **RIGHT** | EAA enforced since June 2025, ADA Title II deadlines 2027/2028, litigation at record highs, overlays discredited by FTC. |
| Positioning | **RIGHT** | Code-level fix loop (scan → AI patch → PR → proof) is the defensible side; overlays are a legal liability. |
| Product completeness | **PARTIAL** | Strong SaaS shell, but **3 load-bearing promises are not actually implemented** (see §1). |
| Pricing | **BROKEN MATH** | "Daily scans" + "5,000 pages/month" cannot both be true for a 5,000-page site. |
| Engineering quality | **GOOD** | Guard chain, crypto, webhooks, tests, types, build all solid. |
| GTM readiness | **NOT YET** | No trial, no working CI integration, no case studies, no public API keys. |
| **Overall** | **BUILD THE CRAWLER, FIX THE CI LOOP, THEN SELL** | The idea is right. The product currently scans **one URL per scan**, not a website. |

**The one-sentence diagnosis:**
> AccessGuard is a well-built SaaS wrapper around a single-page axe-core scan, sold as a site-wide compliance platform. Close that gap and it becomes a real business.

---

## 1. Claim vs Reality (code-verified)

| Promise (pricing/marketing/docs) | Reality in code | Verdict |
|---|---|---|
| "1 / 5 / 15 websites, 500 / 5,000 / 25,000 pages/month" | `scan-executor.ts` calls `scanUrl(url)` for **one URL**; axe strategy returns `pagesScanned: 1`. `crawlConfig` is stored but **never read** by the executor. Only the fetch fallback crawls, default 10 links, and project config is not passed. | 🔴 **Site-wide scanning not implemented** |
| "Daily scans" | Scheduler runs per project; each run = 1 page. A 5,000-page site × daily = 150,000 page-scans/month vs 5,000 quota. | 🔴 **Pricing/quota math impossible** |
| GitHub Action / CI integration | `github-action/src/index.ts` calls `https://api.accessguard.io/api/scan`, `/api/projects/{id}/vpat`, `/api/check`. None of these routes exist (`/api/scans`, `/api/reports/vpat` do). No customer `ApiKey` model in Prisma. | 🔴 **Shipped integration 404s** |
| "Start Free Trial" | No `trial_period_days` in checkout/subscription code. Whether Stripe Price objects have a trial configured is **UNKNOWN** (dashboard-only). | ⚠️ **Verify before claiming trial** |
| VPAT generation | Real: `src/app/api/reports/vpat/route.tsx`. | ✅ |
| Manual checks | Real: `ManualCheck` model, route, `src/lib/manual-checks.ts`. | ✅ |
| AI remediation + GitHub PR | Real: `github-pr.ts`, `fix-validation.ts`, remediation routes. | ✅ |
| Guard chain on every route | Real and regression-tested (`guard-parity.test.ts`). | ✅ |
| SSO / SCIM / audit export / data residency | Real routes + libs. | ✅ |
| Public API | OpenAPI documents API-key auth; no key model, no key UI, no key verification path. | 🔴 **Documentation-only** |
| "No tool can guarantee lawsuit prevention" FAQ | Honest, aligned with FTC precedent. | ✅ **Keep this** |
| Migration completeness | `ScimGroup`, `CookieConsent`, `ManualCheck` absent from migrations. | 🔴 Fresh deploy breaks |

---

## 2. The 129 questions (self-answered)

Legend: ✅ correct · ⚠️ partial · ❌ missing · 🔴 blocker

### A. Idea, market, timing (1–15)

1. **Is the market real?** ✅ ~$0.85–0.99B in 2026, 6–12% CAGR depending on source. Small but real, deadline-driven, recession-resistant.
2. **Is it growing?** ✅ Every forecast is positive; enforcement (not enthusiasm) drives spend.
3. **Is the timing right?** ✅ EAA enforced June 2025; ADA Title II extended to Apr 2027/2028 — a buying window, not a dead deadline.
4. **Is the market crowded?** ✅ Very. Deque, Level Access, Siteimprove, AudioEye, UserWay, accessiBe, Silktide, Monsido, DubBot. Differentiation is mandatory.
5. **Can a small team win?** ✅ Not on "scan everything"; yes on a narrow, painful workflow.
6. **What is the narrow wedge?** ✅ **Fix loop**: find → patch → PR → verify → prove. Competitors detect; few close the loop.
7. **Is "compliance" the right promise?** ❌ Never promise compliance. Sell **evidence of remediation**. FTC fined accessiBe $1M for exactly this overclaim.
8. **Is the ICP clear?** ⚠️ Three ICPs compete: agencies, mid-market dev teams, enterprise/public sector. Pick one for v1.
9. **Best first ICP?** ✅ **Agencies** (10–100 client sites): recurring, white-label, low support, they resell. Second: EU companies hit by EAA.
10. **Is enterprise realistic now?** ❌ No SOC 2 evidence, no case studies, no working API/CI. Enterprise later.
11. **Is the free plan a good wedge?** ✅ 1 site / 100 pages is a real lead magnet — if scanning a site actually works.
12. **Is the product category name right?** ✅ "Accessibility compliance" is searched; "remediation evidence" is the differentiator.
13. **Is WCAG 3 a threat?** ❌ No. Incomplete draft, years away. WCAG 2.2 AA is the standard (ISO/IEC 40500:2025 adopted 2.2 in Oct 2025).
14. **Is EAA just EU?** ✅ Yes, but it covers any business selling into the EU — including US SaaS.
15. **Is the market big enough for a $10M ARR business?** ✅ At $149–399/mo, ~2,000–5,000 paying orgs. Reachable in a niche, not with a generic scanner.

### B. Positioning & differentiation (16–27)

16. **What are we actually selling?** ⚠️ Currently "a scanner with AI". Should be "**the fix loop with proof**".
17. **What do competitors not do well?** ✅ Close the loop with validated patches and audit-ready proof.
18. **Is axe-core a moat?** ❌ No. Commodity, open source, used by everyone.
19. **Is the AI fix a moat?** ⚠️ Only if patches are validated and merge rates are high. Otherwise it's a demo.
20. **Is "AI" a trustworthy claim?** ⚠️ Only with evidence: acceptance rate, merge rate, regression rate. Never fake confidence.
21. **Are overlays a shortcut to revenue?** ❌ No. Legal liability, FTC precedent, developer contempt. Stay code-level.
22. **Should we position against accessiBe?** ✅ Yes, factually: "widgets hide symptoms; we fix source and prove it."
23. **Should we position against Deque?** ❌ No. Deque is the credibility leader; partner/complement instead.
24. **What is the 10-word pitch?** ✅ "Find accessibility bugs, ship verified fixes, prove the fix."
25. **What is the proof asset?** ✅ Before/after violation delta + merged PR + timestamped audit trail.
26. **What is the anti-positioning?** ✅ "Not an overlay. Not a PDF audit. Not a score."
27. **Is the brand name defensible?** ⚠️ Generic; trademark check needed before paid spend.

### C. Product completeness (28–47)

28. **Can a user scan a whole website today?** 🔴 **No.** One URL per scan. This is the #1 gap.
29. **Is sitemap.xml used?** ❌ No.
30. **Is link discovery used?** ⚠️ Only in fetch fallback, max 10, not configurable from project.
31. **Is JS-rendered content scanned?** ✅ Playwright path does; fallback may miss.
32. **Are authenticated pages scannable?** ❌ No login/cookie/session support. Blocks real SaaS/e-commerce.
33. **Are SPAs handled?** ⚠️ Partially (network wait 3s), no route discovery.
34. **Is there a page inventory?** ❌ No per-page model; violations point to URL but no page status/coverage view.
35. **Are duplicate violations deduped across pages?** ❌ No component/rule grouping.
36. **Is there regression detection ("new since last scan")?** ⚠️ Trend exists; new/fixed classification not explicit.
37. **Are alerts sent on new critical issues?** ⚠️ Email exists; no Slack/Teams/webhook.
38. **Is there a CI gate?** 🔴 Action exists but calls dead endpoints.
39. **Is there a public API?** 🔴 Documented, not implemented (no keys).
40. **Is there a browser extension?** ❌ No.
41. **Is there an IDE plugin?** ❌ No.
42. **Is mobile app scanning supported?** ❌ No. Market is moving there; EAA covers apps.
43. **Is PDF/document accessibility supported?** ❌ No. Enterprise/EAA need.
44. **Is manual testing workflow real?** ✅ Model + route + lib exist. Depth unverified.
45. **Is VPAT/ACR generation real?** ✅ Route exists. Accuracy/mapping depth unverified.
46. **Is white-label agency reporting real?** ⚠️ Share links exist; custom branding/workspace unverified.
47. **Is there a compliance statement generator?** ⚠️ Terms/legal exist; accessibility statement generator not evidenced.

### D. Detection quality & honesty (48–59)

48. **How much does automation catch?** ⚠️ 30–57% depending on source; axe-core claims ~57%, practitioners say 30–50%. Assume **~40%**.
49. **Is the product honest about that?** ⚠️ FAQ is honest; UI may imply more. Audit every claim.
50. **Is the risk score defensible?** ❌ Formula is arbitrary (`100 - 10×critical - 5×serious…`). Either document methodology or replace with severity/trend.
51. **Are false positives tracked?** ❌ No feedback loop ("this is wrong") on violations.
52. **Is severity mapping to WCAG correct?** ⚠️ Needs per-criterion audit; axe impact ≠ legal severity.
53. **Is WCAG 2.2 covered?** ✅ Claims 2.1/2.2; verify rule coverage for 2.2 additions (focus not obscured, target size, consistent help).
54. **Is EN 301 549 mapped?** ❌ No preset for EAA buyers.
55. **Is Section 508 mapped?** ⚠️ VPAT route may cover; not evidenced as a preset.
56. **Is there a manual-vs-automated split in reports?** ❌ Not evidenced. Critical for credibility.
57. **Is there a "known limitations" page?** ❌ Add one. It builds trust and reduces legal risk.
58. **Is there a sample report without signup?** ⚠️ Landing live scan exists; full sample report unclear.
59. **Is there a public methodology page?** ❌ Add: what is tested, what is not, how severity is assigned.

### E. Pricing & unit economics (60–73)

60. **Do the tiers map to value?** ⚠️ Yes conceptually (sites/pages), but pages are not actually crawled.
61. **Is $49 too cheap?** ⚠️ Good wedge; too cheap to support. Keep as entry.
62. **Is $149 for 5,000 pages too cheap?** ✅ vs Silktide (~€490/mo for 1,000 pages) and Siteimprove (€2.5k–5k/mo at 10k pages). Underpriced once crawler works.
63. **Is $399 for 25,000 pages viable?** ⚠️ At ~$0.016/page, infra+AI may eat margin. Model it per page.
64. **Is "daily scans" compatible with page quotas?** 🔴 No. 5,000 pages daily = 150k/month.
65. **What should the meter be?** ✅ **Pages monitored**, not page-scans. Scan frequency is a feature, not a multiplier.
66. **Should there be a trial?** ✅ Yes, 14 days, card optional. Currently not implemented.
67. **Should there be annual billing?** ✅ Yes, 2 months free. Not evidenced.
68. **Should there be usage overage?** ✅ Yes, soft cap + overage price beats hard failure.
69. **Is there a free-forever plan?** ✅ Yes, 1 site/100 pages. Good.
70. **Is there an agency/white-label premium?** ⚠️ $399 exists; value not fully delivered yet.
71. **Is enterprise pricing anchored?** ⚠️ "Custom" only. Add a floor ($1k+/mo) to qualify.
72. **Is cost per scan measured?** ❌ No dashboard for compute/AI cost per org. Add before scaling.
73. **Is Stripe tax/VAT handled?** ⚠️ Stripe Tax not evidenced. EU sales need it.

### F. Activation, UX, retention (74–85)

74. **Time to first value?** ⚠️ Landing live scan is great; signup→project→scan path needs measurement.
75. **Is onboarding URL-first?** ✅ Likely; verify one-field start.
76. **Is the first scan result actionable?** ⚠️ Violations exist; "top 3 fixes" prioritization unclear.
77. **Is there a fix-verification loop in UI?** ⚠️ AI fix + PR exist; "mark fixed → rescan → prove" flow unclear.
78. **Is there a weekly digest?** ⚠️ Email exists; content/quality unverified.
79. **Are new violations surfaced first?** ❌ Not explicit.
80. **Is there a "fix streak"/progress view?** ❌ No. Retention driver missing.
81. **Is there team collaboration (assign, comment)?** ⚠️ Roles exist; violation assignment unclear.
82. **Is there an audit-ready export?** ✅ Audit logs + reports exist.
83. **Is the dashboard mobile-usable?** ⚠️ Responsive Tailwind; not verified.
84. **Is there empty-state guidance?** ⚠️ Unknown; audit.
85. **Is churn scoring used to save accounts?** ✅ `churn.ts` exists; playbook unclear.

### G. Trust, legal, security, compliance (86–97)

86. **Is the marketing legally safe?** ✅ FAQ avoids guarantees. Keep auditing.
87. **Is there a DPA?** ⚠️ Legal docs exist; DPA/SCCs not evidenced.
88. **Are subprocessors listed?** ❌ Add a public subprocessor page.
89. **Is there a trust center?** ❌ No.
90. **Is SOC 2 available?** ❌ No evidence. Enterprise blocker.
91. **Is data residency real?** ✅ `dataRegion` + EU consent migration exist.
92. **Is GDPR export real?** ✅ Account export route exists.
93. **Is cookie consent real?** ✅ `CookieConsent` model + route (needs migration).
94. **Is the app itself accessible?** ⚠️ axe scanner + a11y e2e exist; a public accessibility statement is the credibility test.
95. **Is CSP enforced?** ✅ Yes, with report-uri.
96. **Are secrets encrypted at rest?** ✅ AES-256-GCM, fails closed in prod.
97. **Is there an incident/status page?** ✅ Status page route + PagerDuty integration.

### H. GTM: sales, marketing, channels (98–109)

98. **Is there a design partner program?** ❌ No evidence. Do this before scaling spend.
99. **Are there case studies?** ❌ No. Biggest sales asset missing.
100. **Is there a free scanner lead magnet?** ✅ Landing live scan — strong.
101. **Is SEO targeted at buyer intent?** ⚠️ Docs exist; no evidence of "EAA compliance", "ADA audit", "VPAT" content clusters.
102. **Is there an agency partner motion?** ❌ Not evidenced. Highest-leverage channel.
103. **Is there a Shopify/WordPress integration?** ❌ No. Distribution gap.
104. **Is there outbound?** ❌ No. Founder-led outbound to agencies/EU mid-market is the fastest path.
105. **Is pricing public?** ✅ Yes. Good for PLG.
106. **Is there a demo video?** ⚠️ Unknown; add 90-second fix-loop demo.
107. **Is there a comparison page?** ❌ Add "vs overlay", "vs scanner-only".
108. **Is there a referral program?** ❌ No. Agencies refer naturally; add later.
109. **Is there a community?** ❌ No. Accessibility Slack communities are reachable; participate, don't build.

### I. Engineering & ops (110–121)

110. **Can it scan 100 pages concurrently?** ❌ No crawler; worker concurrency exists but per-scan = 1 page.
111. **Is scan throughput measured?** ❌ No p95/queue depth SLO dashboard evidenced.
112. **Is queue idempotent?** ⚠️ Stale-job drain exists; duplicate scan guard unclear.
113. **Is there backpressure?** ✅ BullMQ + concurrency caps.
114. **Is Playwright memory bounded?** ✅ 4G worker cap in compose.
115. **Is Redis a single point of failure?** ⚠️ Fallback exists for rate limit; queue needs Redis.
116. **Are backups/DR documented?** ⚠️ Unknown; verify.
117. **Is DB partitioned?** ⚠️ Deferred until >5M violations — acceptable.
118. **Is observability real?** ✅ Pino + Sentry + PagerDuty + PostHog, env-gated.
119. **Is CI green end-to-end?** ⚠️ CI runs prisma push + tests; migration drift not caught.
120. **Is deploy reproducible?** ⚠️ Docker standalone yes; migrations no.
121. **Is there a staging environment?** ⚠️ Unknown; needed before paid traffic.

### J. AI strategy (122–129)

122. **Is free-tier AI a good strategy?** ✅ For $0 MVP; ⚠️ rate limits and reliability for paid customers.
123. **Is there a paid fallback?** ⚠️ Circuit breaker exists; paid provider not configured.
124. **Are prompts versioned?** ⚠️ Check; needed for regression evals.
125. **Are evals run?** ❌ No evidence of golden-set evals for fix quality.
126. **Is fix validation real?** ✅ `fix-validation.ts` exists. Measure acceptance.
127. **Does AI failure block the product?** ✅ Template fallback. Keep.
128. **Is confidence honest?** ⚠️ Verify no fabricated scores in UI.
129. **Is cost capped per org?** ❌ No per-org AI budget. Add before scale.

---

## 3. Top 12 gaps, ranked

| # | Gap | Why it matters | Severity |
|---|---|---|---|
| 1 | **No site crawler** | Product cannot deliver what pricing sells; every competitor crawls | 🔴 P0 |
| 2 | **Broken GitHub Action + no API keys** | CI is the developer wedge; shipped artifact 404s | 🔴 P0 |
| 3 | **Pricing math (daily × pages)** | Unfulfillable promise → refunds/churn/legal | 🔴 P0 |
| 4 | **Missing migrations** | Fresh prod deploy omits 3 tables | 🔴 P0 |
| 5 | **No real trial** | "Start Free Trial" may charge instantly | 🟠 P1 |
| 6 | **No regression alerts (Slack/webhook)** | Monitoring without alerts is a report, not a product | 🟠 P1 |
| 7 | **No page inventory / per-page view** | Users can't see coverage or prioritize | 🟠 P1 |
| 8 | **Risk score is arbitrary** | Credibility + legal risk | 🟠 P1 |
| 9 | **No authenticated scans** | Blocks SaaS/e-commerce ICP | 🟠 P1 |
| 10 | **Manual testing + VPAT depth** | Automation alone is ~40%; enterprise needs hybrid evidence | 🟠 P1 |
| 11 | **No white-label agency workspace** | Highest-LTV segment under-served | 🟠 P1 |
| 12 | **No case studies / design partners** | Cannot sell trust without proof | 🟠 P1 |

---

## 4. 90-day plan

### Weeks 1–2 — Make the product true (P0)
- **Crawler v1**: sitemap + BFS links + Playwright render; `maxPages` from `crawlConfig`; exclude paths/subdomains; per-page violations; page inventory; dedupe by rule+selector; quota per page; concurrency + politeness.
- **Fix CI**: real `ApiKey` model (hashed, scoped, revocable, UI), `/api/v1` endpoints, repair GitHub Action (`/api/v1/scans`, `/api/v1/reports/vpat`), PR gate on new critical/serious.
- **Trial**: `trial_period_days: 14`, verify Stripe price config, no-charge-until-day-15.
- **Migrations**: add `ScimGroup`, `CookieConsent`, `ManualCheck`, quota default; test `migrate deploy` on empty DB.
- **Green baseline**: start Docker, 401/401 tests, commit WIP in slices.
- **Exit criteria**: scan a 100-page site end-to-end; Action fails a PR on a real violation; fresh DB migrates clean.

### Weeks 3–4 — Make it sticky (P1)
- Regression detection: new/fixed/resolved vs previous scan; email + Slack + outbound webhook.
- Pricing v2: **pages monitored** meter, smart scheduling (daily critical, weekly long tail), overage.
- Page inventory UI: coverage, per-page status, top fixes.
- Risk score → transparent severity/trend or documented methodology.
- Manual checks v1: guided scripts, evidence upload, tester role.

### Weeks 5–8 — Make it sell (P1)
- Agency workspace: client groups, white-label reports, bulk scan.
- VPAT/ACR v2: WCAG 2.2 AA + EN 301 549 + Section 508, per-criterion remarks.
- Onboarding: URL → scan → top 3 fixes in <5 min; sample report without signup.
- Jira/Linear + Slack/Teams.
- Authenticated scans (cookie/login script).
- 3 design partners + 2 case studies.

### Weeks 9–12 — Make it scale (P2)
- SOC 2 readiness (if enterprise pipeline exists), DPA/subprocessors/trust center.
- Document/PDF accessibility (integrate, don't build).
- Mobile app scanning (partner/integrate).
- Cost dashboard: $/1k pages, AI $/org, queue SLOs.
- Annual billing, VAT via Stripe Tax.

---

## 5. Metrics that decide everything

| Funnel | Metric | Target |
|---|---|---|
| Acquisition | Visitor → free scan | >25% |
| Activation | Signup → first completed scan | >60% |
| Time-to-value | Signup → first violation seen | <5 min |
| Quality | Scan success rate | >95% |
| Quality | False-positive rate (manual sample) | <10% |
| Engagement | Weekly active orgs / paid orgs | >60% |
| Conversion | Free → paid (90d) | >5% |
| Conversion | Trial → paid | >20% |
| Retention | Logo churn / month | <3% |
| Expansion | NRR | >100% |
| AI | Fix acceptance → PR merge rate | >40% |
| Cost | Infra + AI per 1k pages | <$2 |

---

## 6. What NOT to do (protect focus)

- ❌ Don't build an overlay/widget. Legal liability; FTC precedent.
- ❌ Don't claim "100% compliance", "ADA certified", or guaranteed lawsuit prevention.
- ❌ Don't add more AI models before measuring fix merge rate.
- ❌ Don't add more languages before revenue.
- ❌ Don't chase enterprise (SOC 2, SSO depth) before agency wedge works.
- ❌ Don't build mobile/document scanning in-house; integrate.
- ❌ Don't microservices/Kubernetes/partition DB yet.
- ❌ Don't raise prices before crawler + CI actually deliver.

---

## 7. Immediate next 3 actions

1. **Build crawler v1** (2 weeks). Nothing else matters until "scan my website" is true.
2. **Repair CI**: API keys + `/api/v1` + GitHub Action. This is the developer distribution wedge.
3. **Fix trial + migrations + pricing meter**, then get 3 design partners and 2 case studies.

---

## Sources

- Mordor Intelligence — Digital Accessibility Software Market 2026–2031 (~$0.85B 2026, 6.23% CAGR).
- Fortune Business Insights — ~$0.93B 2026, 9.33% CAGR to 2034.
- European Accessibility Act enforcement/fines by country (accessibility.build, Nov 2026); Spain up to €1M; Netherlands ACM visits (June 2026).
- ADA.gov — Title II Interim Final Rule (Apr 2026): deadlines extended to Apr 2027 / Apr 2028.
- FTC — accessiBe $1M final order (Apr 2025).
- UsableNet — 2025 Year-End Digital Accessibility Lawsuit Report.
- Deque axe-core / practitioner sources — automation catches ~30–57% of WCAG issues.
- W3C WAI — WCAG 3 is an incomplete draft, years away.
- Vendor pricing checked Oct–Nov 2026: accessiBe ($59/$179/$479/mo), UserWay ($490–$2,490/yr widget; $990–$10,990/yr monitoring), Silktide (~€490/mo at 1k pages → €4,300/mo at 50k), Siteimprove (quote, est. €2.5k–5k/mo at 10k pages).
