# AccessGuard — Tasks

Source of record for execution. Full analysis: `.ai/PRODUCT-CRITIQUE.md`.

## P0 — Make the product true (weeks 1–2)

- [x] **Crawler v1** — sitemap + BFS + Playwright render; `maxPages` from `crawlConfig`; exclude paths/subdomains; per-page violations; page inventory; dedupe; quota per page.
  - Acceptance: 100-page site scanned end-to-end; per-page results; quota counts 100; p95 under 10 min.
- [x] **Customer API keys** — `ApiKey` model (hash, prefix, scopes, lastUsedAt, revoke), create/revoke UI, auth on `/api/v1`.
- [x] **GitHub Action repair** — point to `/api/v1/scans` + `/api/v1/reports/vpat`; PR gate on new critical/serious; publish `dist/index.js`.
  - Acceptance: Action runs on a sample repo, fails a PR on a real violation, passes after fix.
- [x] **Trial** — `trial_period_days: 14` in checkout/subscription; verify Stripe price config; no charge before day 15.
- [x] **Migrations** — `ScimGroup`, `CookieConsent`, `ManualCheck`, `pagesQuota` default; migration created at `prisma/migrations/20261120231949_...`; verify `migrate deploy` on empty DB after Docker up.
- [x] **Violation lifecycle** — fingerprint + reconciliation (new/persisting/fixed/regressed); write `fixedAt` on rescan.
- [x] **Scanner truth** — bundle axe locally (no CDN), WCAG 2.2 tags, stop blocking images/fonts, mobile viewport, network-idle wait, store axe target array as JSON, `help` text not `helpUrl`, remove `--disable-web-security`.
- [x] **AST patching** — ts-morph/Babel/PostCSS/parse5; occurrence-aware; reject placeholders; no-op detection (content unchanged ≠ fix).
  - Acceptance: JSX/TSX patched through a real AST (TypeScript compiler API), nth occurrence matched, placeholder rejected, unchanged output rejected, patched file re-parses without syntax errors.
- [x] **Fix verification** — apply patch to preview, re-run axe, only verified patches may open a PR; confidence from verification, template = `null`.
  - Acceptance: axe re-run on the patched element; PR opens only for verified fixes; effective confidence comes from verification; template fixes carry `null` AI confidence; no browser = fail closed with a clear error.
- [x] **Confidence gate fix** — `null` must not bypass `MIN_FIX_CONFIDENCE`.
  - Acceptance: a fix with `null` confidence is skipped, never auto-applied; gate unit-tested.
- [x] **VPAT truth** — "Not Evaluated" instead of "Not Applicable"; add remarks column; label "draft — human review required".
  - Acceptance: PDF route reuses `generateVPATData` (`not-evaluated` + per-criterion remarks), no "Not Applicable"/"N/A" wording survives, draft label on cover and footer.

## V23 — verified-fix engine (shipped)

Scope: the four P0 truth gaps above, shipped as one volume. Dependency order: confidence semantics → VPAT truth → AST patching → verification → docs/copy.

| # | Slice | Area | Status |
|---|---|---|---|
| 1 | Confidence semantics: template fixes carry `null`, gate reads effective (verification) confidence | ai | DONE |
| 2 | VPAT PDF reuses the shared generator (`not-evaluated`, remarks, draft label) | engineering | DONE |
| 3 | AST patching: JSX/TSX via TypeScript compiler API, occurrence-aware, placeholder + no-op rejection | engineering | DONE |
| 4 | Fix verification: axe re-run on the patched element gates PR creation | ai | DONE |
| 5 | Docs + marketing copy aligned with what the engine actually does | docs | DONE |
| 6 | Post-ship hardening: bounded selection (`MAX_FIXES_PER_PR = 25`), per-reason skip reporting (`skippedInvalid`, `skippedOverLimit`), 10-file write cap, tested `selectVerifiedFixes` | ai | DONE |
| 7 | Security hardening from the independent QA + security review: validate before render, block verification network access, sandbox + deadlines, cap before the browser work, rate limit, audit trail, ambiguity guard, content-loss guard, honest counters, Markdown escaping, VPAT conformance | security | DONE |

Out of scope for V23 (recorded, not silently dropped): per-file patch persistence to the DB (verification results are reported in the PR + response, not stored on `Violation`), Vue/Svelte/Astro AST support, full-page re-scan verification (verification is rule-level on the patched element).
- [x] **Green baseline** — Docker up, `vitest` 378 passed (core), lint 0, build 0; commit WIP in slices (`vol:` messages).

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
- [x] Authenticated scans (cookie / header / login script).
- [ ] 3 design partners + 2 case studies.

## P2 — Scale (weeks 9–12)

- [ ] SOC 2 readiness (only if enterprise pipeline exists); DPA + subprocessors + trust center.
- [ ] Document/PDF accessibility (integrate).
- [ ] Mobile app scanning (partner/integrate).
- [ ] Cost dashboard: $/1k pages, AI $/org, queue SLOs.
- [ ] Annual billing + Stripe Tax (VAT).

## Open defects (from the 2026-11-21 Playwright run: 70 pass / 9 fail)

- [x] **Contrast token pass** — severity + emerald tokens retuned for WCAG AA as 12px text on
      their own 10% tint (light `--critical/--serious/--moderate/--minor/--emerald`, dark
      `--critical`). Verified: axe `color-contrast` green on 13 routes × 2 themes.
- [x] **Stale e2e expectation** — `e2e/landing.spec.ts` now expects `/dashboard` (the shipped
      contract for authenticated visitors).
- [x] **Settings privacy copy** — the spec waited for the tab to become active; the click had
      landed before React hydration, so the panel never switched. Copy itself was correct
      ("Export My Data" / "Data Residency Region" / "EU").

Full suite after the fix: **79 passed / 0 failed**.

## Blocked

- [ ] Docker Desktop service stopped → DB/Redis tests, E2E, dev server.
