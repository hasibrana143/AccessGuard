# AccessGuard — Tasks

Source of record for execution. Full analysis: `.ai/PRODUCT-CRITIQUE.md`.

## P0 — Make the product true (weeks 1–2)

- [x] **Crawler v1** — sitemap + BFS + Playwright render; `maxPages` from `crawlConfig`; exclude paths/subdomains; per-page violations; page inventory; dedupe; quota per page.
  - Acceptance: 100-page site scanned end-to-end; per-page results; quota counts 100; p95 under 10 min.
- [ ] **Customer API keys** — `ApiKey` model (hash, prefix, scopes, lastUsedAt, revoke), create/revoke UI, auth on `/api/v1`.
- [ ] **GitHub Action repair** — point to `/api/v1/scans` + `/api/v1/reports/vpat`; PR gate on new critical/serious; publish `dist/index.js`.
  - Acceptance: Action runs on a sample repo, fails a PR on a real violation, passes after fix.
- [ ] **Trial** — `trial_period_days: 14` in checkout/subscription; verify Stripe price config; no charge before day 15.
- [x] **Migrations** — `ScimGroup`, `CookieConsent`, `ManualCheck`, `pagesQuota` default; migration created at `prisma/migrations/20261120231949_...`; verify `migrate deploy` on empty DB after Docker up.
- [x] **Violation lifecycle** — fingerprint + reconciliation (new/persisting/fixed/regressed); write `fixedAt` on rescan.
- [x] **Scanner truth** — bundle axe locally (no CDN), WCAG 2.2 tags, stop blocking images/fonts, mobile viewport, network-idle wait, store axe target array as JSON, `help` text not `helpUrl`, remove `--disable-web-security`.
- [ ] **AST patching** — ts-morph/Babel/PostCSS/parse5; occurrence-aware; reject placeholders; no-op detection (content unchanged ≠ fix).
- [ ] **Fix verification** — apply patch to preview, re-run axe, only verified patches may open a PR; confidence from verification, template = `null`.
- [ ] **Confidence gate fix** — `null` must not bypass `MIN_FIX_CONFIDENCE`.
- [ ] **VPAT truth** — "Not Evaluated" instead of "Not Applicable"; add remarks column; label "draft — human review required".
- [ ] **Green baseline** — Docker up, `vitest` 401/401, lint 0, build 0; commit WIP in slices (`vol:` messages).

## P1 — Make it sticky (weeks 3–4)

- [ ] Regression detection: new / fixed / persisting vs previous scan.
- [ ] Alerts: email + Slack + outbound webhook (signed, retried).
- [ ] Pricing v2: pages **monitored** meter; smart scheduling (daily critical, weekly long tail); overage.
- [ ] Page inventory UI: coverage, per-page status, top fixes.
- [ ] Risk score → transparent severity/trend or documented methodology.
- [ ] Manual checks v1: guided scripts, evidence upload, tester role.

## P1 — Make it sell (weeks 5–8)

- [ ] Agency workspace: client groups, white-label report branding, bulk scan.
- [ ] VPAT/ACR v2: WCAG 2.2 AA + EN 301 549 + Section 508, per-criterion remarks.
- [ ] Onboarding: URL → scan → top 3 fixes in <5 min; sample report without signup.
- [ ] Jira/Linear + Slack/Teams.
- [ ] Authenticated scans (cookie / login script).
- [ ] 3 design partners + 2 case studies.

## P2 — Scale (weeks 9–12)

- [ ] SOC 2 readiness (only if enterprise pipeline exists); DPA + subprocessors + trust center.
- [ ] Document/PDF accessibility (integrate).
- [ ] Mobile app scanning (partner/integrate).
- [ ] Cost dashboard: $/1k pages, AI $/org, queue SLOs.
- [ ] Annual billing + Stripe Tax (VAT).

## Blocked

- [ ] Docker Desktop service stopped → DB/Redis tests, E2E, dev server.
