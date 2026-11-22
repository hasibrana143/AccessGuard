# AccessGuard — Current State

| Field | Value |
|---|---|
| Current phase | **SECURITY FIX LOOP — V23 seventh-review closure shipped, eighth review pending** 🔴 |
| Current task | Eighth independent security review of the seventh-review closure; the release gate opens only on READY (Critical 0, High 0) |
| Owner | CTO agent |
| Status | AMBER — the seven seventh-review findings (High 3, Medium 4) are fixed at their root cause, every working reproduction is blocked and the whole gate suite is green; the gate stays closed until the eighth independent review returns READY |
| Blocked | Strix autonomous pentest remains unavailable — every provider refused the run (quota / EOL model / no credits); no Strix evidence exists for this cycle |
| Next action | Run the eighth independent security review against the pushed tree; fix every finding at the root cause with a permanent regression and repeat until READY |
| Last verification | 2026-11-22 — seventh-review closure: tsc 0, lint 0, vitest 53 files/703 tests, coverage 64.94/56.85/66.88/66.50, build 0, Playwright 79/79, npm audit High 0; 39/39 reviewer-payload re-run assertions (26 prior + 8 seventh-review payloads blocked, 9 legitimate behaviours pass) |

**Product verdict:** `.ai/PRODUCT-CRITIQUE.md` — original issues fixed: crawler implemented, GitHub Action repaired, trial added, pricing math resolved. Deep critique: `.ai/PRODUCT-CRITIQUE-DEEP.md` — P0 truth gaps closed in V23. Execution plan: `.ai/TASKS.md`.

## Evidence (2026-11-22, seventh-review closure)

| Check | Result |
|---|---|
| Seventh-review closure | PASS — all seven findings (7-H1, 7-H2, 7-H3, 7-M1…7-M4) fixed at their root cause; the dispositions are in `.ai/SECURITY-STATUS.md` and the reviewer's own artifact is `.ai/SECURITY-REVIEW-7.md` |
| Permanent regressions | PASS — every reproduction of the seventh review has a shipped regression: the CSS priority suffix, the logical viewport units, the uncomputable value, the relational selector, the dynamic style carrier, the three remote-URL spellings, the navigation mutation, the eight hiding styles, the live-element carriers, the dropped media source and the frameset |
| Temporary reviewer-payload re-run | PASS — 1 file, 39/39 assertions: the 12 fourth-review payloads, the 6 fifth-review payloads, the 8 sixth-review payloads and the 8 seventh-review reproductions are blocked in the unsafe direction, and the 9 legitimate behaviours still pass. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 703/703 tests (was 53/667) |
| Coverage | PASS — statements 64.94% (threshold 55) · branches 56.85% (50) · functions 66.88% (58) · lines 66.50% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Eighth independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-22, sixth-review closure)

| Check | Result |
|---|---|
| Sixth-review closure | PASS — all eight findings (6-H1, 6-H2, 6-M1…6-M6) fixed at their root cause; the dispositions are in `.ai/SECURITY-STATUS.md` |
| Permanent regressions | PASS — every reproduction of the sixth review has a shipped regression: destination CSS (a preprocessor stylesheet, a linked stylesheet, ten browser-valid rule variants), the comment opener, the self-hiding element, transparent text, the new remote URL, the three non-live contexts and the ambiguous blob |
| `npx vitest run --coverage` | PASS — 53 shipped files, 667/667 tests (was 53/634) |
| Coverage | PASS — statements 64.80% (threshold 55) · branches 56.21% (50) · functions 66.80% (58) · lines 66.34% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Seventh independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-22, fifth-review closure)

| Check | Result |
|---|---|
| Fifth-review closure | PASS — all six findings (5-H1, 5-H2, 5-M1, 5-M2, 5-M3, 5-M4) fixed at the root cause; the dispositions are in `.ai/SECURITY-STATUS.md` |
| Exact-payload reproduction suite (temporary) | PASS — 1 file, 8/8 tests: the six fifth-review payloads and the twelve fourth-review payloads are blocked, and the legitimate fix still lands. The file was deleted after the run |
| `npx vitest run --coverage` | PASS — 53 shipped files, 634/634 tests |
| Coverage | PASS — statements 63.83% (threshold 55) · branches 55.16% (50) · functions 66.04% (58) · lines 65.29% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, 0 errors |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev toolchain) |
| Sixth independent security review | PENDING — the release gate opens only on READY (Critical 0, High 0) |

## Evidence (2026-11-22, fifth independent security review)

| Check | Result |
|---|---|
| Fifth independent V23 security review | **NOT READY — Critical 0, High 2, Medium 4, Low 0**; six working reproductions are in `.ai/SECURITY-STATUS.md` |
| Fourth-review payload re-run | PASS — 12/12 literal payloads blocked; `<!-->` and `java&NewLine;script:` variants are also blocked |
| Fifth-review temporary suites | PASS as evidence harnesses — 36/36 broad assertions and 7/7 focused reproductions; every temporary test was deleted |
| `npx vitest run` (with review file) | PASS — 53 files, 641/641 tests |
| `npx vitest run` (after review-file deletion) | PASS — 52 shipped files, 605/605 tests |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npm audit --audit-level=high --json` | PASS — Critical 0, High 0, Moderate 15, Low 0 |
| Tracked-file secret scan | PASS — 771 tracked text files; no live secret; one key-shaped documentation example was redacted during classification |
| Shipped-source cleanup | PASS — `git diff --name-only -- src` and the untracked-file list were empty after temporary-test deletion |

## Evidence (2026-11-22, fourth-review closure)

| Check | Result |
|---|---|
| Fourth independent V23 security review | **NOT READY — Critical 0, High 3, Medium 9, Low 0**; every finding is now fixed, see the disposition table in `.ai/SECURITY-STATUS.md` |
| Reviewer exploit reproductions (re-run on the fixed tree) | PASS — 12/12 blocked: named-entity CSS overlay, `--!>` comment breakout, JSX/TS source injection, GFM bare-URL autolink, `plaintext`, the resource loaders, `encoding:none`, the omitted `.mjs` scan, `opacity:0`, the label reduction, the swapped remediations, the commented element |
| `npx vitest run --coverage` | PASS — 52 shipped files, 605/605 tests |
| Coverage | PASS — statements 62.88% (threshold 55) · branches 54.46% (50) · functions 64.91% (58) · lines 64.26% (57) |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (4.4 min) |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| GitHub Markdown API (bare-URL evidence) | PASS — the escaped URL renders as plain text; the control renders as a live link |
| Docker image gate | **PASS — run 44955598091 completed ✅** on `8afc55a`; the Trivy step passes with `limit-severities-for-sarif: true` and the pinned scanner `v0.76.2` |
| Temporary-file cleanup | PASS — the temporary reproduction file was deleted; the shipped suite runs 52 files |

## Evidence (2026-11-22, fourth independent security review)

| Check | Result |
|---|---|
| Fourth independent V23 security review | **NOT READY — Critical 0, High 3, Medium 9, Low 0**; working outputs and attempted variants are in `.ai/SECURITY-STATUS.md` |
| Review exploit reproductions | **FAIL** — 4-H1 named-entity CSS overlay, 4-H2 `--!>` comment breakout, 4-H3 JSX/TS source injection and nine Medium equivalent paths reproduce |
| Temporary review suite | PASS as an evidence harness — 2 files, 32/32 tests; the unsafe cases assert the exploit and the exact cases assert the write is blocked |
| `npx vitest run` (with review files) | PASS — 54 files, 612/612 tests |
| `npx vitest run` (after review-file deletion) | PASS — 52 shipped files, 580/580 tests |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build, 116 static pages) |
| `npm audit --audit-level=high --json` | PASS — Critical 0, High 0, Moderate 15, Low 0 |
| Temporary-file cleanup | PASS — both `tmp-security-review.test.ts` files deleted; no source change remained |

## Evidence (2026-11-22, third review closure + CI repair)

| Check | Result |
|---|---|
| Third independent V23 security review | **NOT READY — Critical 0, High 2, Medium 5**; every finding is now fixed, see the disposition table in `.ai/SECURITY-STATUS.md` |
| Reviewer exploit reproductions (re-run on the fixed tree) | PASS — 5/5 blocked: CSS-escaped overlay, frame/frameset, Markdown-injected selector, `aria-hidden` text deletion, wrong duplicate occurrence |
| `npx vitest run` | PASS — 52 files, 580 tests, 0 failed |
| `npx vitest run --coverage` | PASS — statements 62.29% / branches 53.55% / functions 64.43% / lines 63.71% (CI thresholds 55/50/58/57) |
| `npm run lint` | PASS — exit 0 |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 (Next standalone build) |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| Docker image gate | The image carries no HIGH/CRITICAL finding; the job failed because `trivy-action` drops the severity filter in SARIF mode — fixed with `limit-severities-for-sarif: true` and a pinned scanner (`v0.76.2`). The proof run is in `.ai/DEPLOYMENT.md` |

## Evidence (2026-11-22, third independent security review)

| Check | Result |
|---|---|
| Third independent V23 security review | **NOT READY — Critical 0, High 2, Medium 5**; findings and working outputs are in `.ai/SECURITY-STATUS.md` |
| `npx vitest run` | PASS — 51 files, 566 tests, 0 failed |
| `npm run lint` | PASS — exit 0 |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS — exit 0 |
| Production build + Docker image build | PASS — exit 0; synthetic build sentinel absent from artifacts and image history; temporary image deleted |
| `npm audit --json` | Critical 0 · High 0 · Moderate 15 (dev toolchain) |
| Reviewer exploit reproductions | **FAIL** — escaped CSS overlay and active frame/frameset both verified and reached the repository writer |

## Evidence (2026-11-22, V23 re-review closure)

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npx vitest run` | PASS — 51 files, 566 tests, 0 failed (was 50/523) |
| `npx vitest run --coverage` | PASS — statements 62.07% / branches 53.25% / functions 64.19% / lines 63.47% (CI thresholds 55/50/58/57) |
| `npm run build` | PASS (exit 0) — Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| Reviewer exploit reproductions (6) | PASS — every reproduction of the re-review is blocked: handler in the scanned page, `/onerror=`, entity encoded `javascript:`, overlay style, wrong element by class, hidden text |
| Browser isolation (real Chromium) | PASS — no HTTP request and no WebSocket reaches a local server during verification |
| Independent security re-review of the hardening | NOT READY (High 2, Medium 7, Low 1) → **all findings closed** and covered by regression tests |
| Strix autonomous pentest | BLOCKED — every configured provider refused the run (quota / EOL model / no credits). No Strix evidence exists for this cycle |

## Evidence (2026-11-21, V23 verified-fix engine + security hardening)

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npx vitest run` | PASS — 50 files, 523 tests, 0 failed (was 45/410) |
| `npx vitest run --coverage` | PASS — statements 60.54% / branches 52.05% / functions 63.43% / lines 61.84% (CI thresholds 55/50/58/57) |
| `npm run build` | PASS (exit 0) — Next standalone build |
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| axe verification in a real browser (vitest) | PASS — verified / failed / rejected cases behave as specified |
| Independent QA review of the V23 diff | 3 reproduced P0 defects → all fixed and covered by tests |
| Independent security review of the V23 diff | NOT READY (High 3) → all High/Medium/Low findings fixed and covered by tests |
| Strix autonomous pentest | BLOCKED — every configured provider refused the run (quota / EOL model / no credits). No Strix evidence exists for this cycle |

## Evidence (2026-11-21, accessibility gate cycle)

| Check | Result |
|---|---|
| `npx playwright test --project=chromium` | PASS — 79 passed, 0 failed (was 70/9) |
| axe `color-contrast` on 13 routes × 2 themes | PASS — severity + emerald tokens retuned for AA text |
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npx vitest run` | PASS — 45 files, 410 tests, 0 failed |
| `npm run build` | PASS (exit 0) — Next 16.4.6, standalone build |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |

## Evidence (2026-11-21, authenticated scans cycle)

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npx vitest run` | PASS — 44 files, 407 tests, 0 failed |
| `npm run build` | PASS (exit 0) — Next 16.4.6, 116/116 static pages, standalone build |
| `npm audit --audit-level=high` | PASS — Critical 0, High 0 (15 moderate, dev-toolchain) |
| `npx prisma validate` / `generate` | PASS |
| `prisma migrate deploy` on a fresh database | PASS — all 13 migrations, `migrate diff` = "No difference detected" |
| `prisma migrate diff` dev DB → `schema.prisma` | PASS — zero drift |
| `node scripts/audit-actions-diff.mjs` | PASS — MISSING_LABELS=0 (TOTAL_ACTIONS=65) |
| i18n key parity en/hi | PASS — 1500 keys, 0 missing |
| OpenAPI parity | PASS — 112 paths, 70 schemas, every route handler covered |

## P0 Tasks Completed

1. ✅ **Scanner truth** — Local axe-core 4.12.1, WCAG 2.2 tags (`wcag22aa`), mobile+desktop viewports, no asset blocking, networkidle wait, accurate selectors (`elementPath` JSON), `help` not `helpUrl`, removed `--disable-web-security`
2. ✅ **Violation lifecycle** — Fingerprint (SHA256), reconciliation (new/persisting/fixed/regressed), `fixedAt` on rescan, `elementPath`/`helpUrl`/`fingerprint` fields in DB
3. ✅ **Migrations** — SQL files created for `ScimGroup`, `CookieConsent`, `ManualCheck`, `Violation.fingerprint`, `pagesQuota` default; applied via `prisma migrate deploy`
4. ✅ **Crawler v1** — Sitemap discovery + BFS, per-page axe scans, quota per page, mergeViolations dedupe, uses `project.crawlConfig`
5. ✅ **Customer API keys** — `ApiKey` model (hash, prefix, scopes, lastUsedAt, revoke), `/api/v1/apikeys` CRUD, `/api/v1/scans`, `/api/v1/reports/vpat` with Bearer/ApiKey auth
6. ✅ **GitHub Action repair** — Points to `/api/v1/scans` + `/api/v1/reports/vpat`; `api-url`/`url` inputs; `dist/index.js` rebuilt
7. ✅ **Trial** — `trial_period_days: 14` added to Stripe checkout session + subscription creation
8. ✅ **OpenAPI v1 docs** — `/api/v1/*` routes documented with `apiKeyAuth` security scheme

## Open Items (P1+)

| Area | Task |
|---|---|
| Regression detection | new / fixed / persisting vs previous scan |
| Alerts | email + Slack + signed webhook (new critical only) |
| Pricing v2 | pages **monitored** meter; smart scheduling (daily critical, weekly long tail); overage |
| Page inventory UI | coverage, per-page status, top fixes |
| Risk score | transparent severity/trend or documented methodology |
| Manual checks v1 | guided scripts, evidence upload, tester role |
| Agency workspace | client groups, white-label report branding, bulk scan |
| VPAT/ACR v2 | WCAG 2.2 AA + EN 301 549 + Section 508, per-criterion remarks |
| Onboarding | URL → scan → top 3 fixes in <5 min; sample report without signup |
| Authenticated scans | cookie / header / login script — **done** (encrypted at rest, admin-gated) |
| Design partners | 3 partners + 2 case studies |
| Strix security scan | CI integration, PR gate |
| E2E tests | Playwright critical paths |

## Commits (this session)

- `049c765` vol: scanner - P0: local axe-core, WCAG 2.2, mobile viewport, no asset blocking; violation lifecycle fingerprint+reconciliation; migrations
- `0db9428` vol: crawler - P0: sitemap+BFS discovery, per-page axe scans, quota per page, mergeViolations dedupe; scan-executor uses project.crawlConfig
- `07db28b` vol: api-keys - P0: ApiKey model + create/revoke/list endpoints; /api/v1/scans + /api/v1/reports/vpat with API key auth; VPAT generator extracted to lib
- `ab2c04d` vol: github-action - P0: repaired endpoints to /api/v1/scans + /api/v1/reports/vpat; added api-url/url inputs; rebuilt dist/index.js
- `98a379f` vol: trial - P0: added trial_period_days=14 to Stripe checkout session and subscription creation
- `2b577ea` vol: green-baseline - P0 complete: scanner truth, violation lifecycle, migrations, crawler v1, API keys, GitHub Action, trial, OpenAPI v1 docs; build passes, typecheck clean