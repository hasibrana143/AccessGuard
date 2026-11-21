# AccessGuard — Current State

| Field | Value |
|---|---|
| Current phase | **P1 — MAKE IT SELL** 🔄 |
| Current task | Authenticated scans (cookie / header / login script) — shipped; design partners next |
| Owner | CTO agent |
| Status | GREEN — Regression + alerts + pricing v2 + page inventory + risk score + manual checks + agency workspace + VPAT v2 + onboarding + integrations + authenticated scans done |
| Blocked | None |
| Next action | 3 design partners + 2 case studies (P1 sell phase) |
| Last verification | 2026-11-21 |

**Product verdict:** `.ai/PRODUCT-CRITIQUE.md` — original issues fixed: crawler implemented, GitHub Action repaired, trial added, pricing math resolved. Execution plan: `.ai/TASKS.md`.

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