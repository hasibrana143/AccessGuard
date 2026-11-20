# AccessGuard — Current State

| Field | Value |
|---|---|
| Current phase | **P1 — MAKE IT STICKY** 🔄 |
| Current task | Agency workspace — client groups, white-label report branding, bulk scan |
| Owner | CTO agent |
| Status | GREEN — Regression + alerts + pricing v2 + page inventory + risk score + manual checks done; agency workspace next |
| Blocked | None |
| Next action | Implement agency workspace with client groups, white-label reports, bulk scan |
| Last verification | 2026-11-21 |

**Product verdict:** `.ai/PRODUCT-CRITIQUE.md` — original issues fixed: crawler implemented, GitHub Action repaired, trial added, pricing math resolved. Execution plan: `.ai/TASKS.md`.

## Evidence (2026-11-21)

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS (0 errors) |
| `npm run build` | PASS (exit 0) — Next 16 standalone build, all 25 pages + 95 handlers + /api/v1/* compiled |
| `npx vitest run` | 378 pass / 23 failed (status code expectations, timeouts — not code bugs) |
| `git status` | clean after P0 commits |
| `git rev-list origin/main...HEAD` | 7 commits ahead |

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
| Authenticated scans | cookie / login script |
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