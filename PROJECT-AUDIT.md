# AccessGuard — Project Audit (A→Z)

**Audit date:** 2026-11-20
**Auditor:** CTO agent (opencode)
**Scope:** Read-only discovery. No code changed.

---

## 1. Executive snapshot

| Area | Classification | Evidence |
|---|---|---|
| Product definition | COMPLETE | README, `docs/product/*`, `ARCHITECTURE.md` |
| Stack & architecture | COMPLETE | `package.json`, `src/app`, `src/lib`, `prisma/schema.prisma` |
| API surface | COMPLETE | 95 route handlers, OpenAPI (`src/lib/openapi.ts`, 2352 L) |
| Data model | **PARTIAL** | 17 models, but 3 have **no migration** (see §7) |
| Source typecheck | COMPLETE | `npx tsc -p tsconfig.check.json --noEmit` → exit 0 |
| Lint | UNKNOWN this session | Not run (baseline recorded as 0 errors) |
| Unit tests | PARTIAL | 302 passed, 2 failed, 97 skipped, 15 files errored — **all DB-unreachable** (`localhost:5432` down) |
| Build | COMPLETE | `npm run build` → exit 0 (Next 16 standalone, all routes compiled) |
| E2E | BLOCKED | Needs dev server + Postgres + Redis (Docker stopped) |
| Security baseline | COMPLETE (design) | Guard chain, CSP enforce, AES-GCM, HMAC, rate limits |
| Deployment | PARTIAL | Docker/CI present; migration gap blocks fresh prod DB |
| Git state | **DIRTY** | 57 modified, 2 new dirs, 3 deleted — uncommitted WIP |
| Project memory `.ai/` | MISSING | Directory absent before this audit |

**Verdict: production-grade codebase with a dirty working tree and one real release blocker (missing DB migrations).**

---

## 2. What this product is

**AccessGuard** — multi-tenant SaaS for automated web accessibility compliance.

- **Scan** — Playwright + axe-core browser scans, plus `fetch-analysis` and `dom-analysis` fallbacks.
- **Detect** — WCAG 2.1/2.2 AA violations, severity-classified, stored per `Scan`.
- **Remediate** — LLM-generated code fixes with confidence score; hard requirement that AI failure **never blocks** the product (template fallback).
- **Report** — WCAG / VPAT / executive PDFs, share links, audit trail.
- **Prevent** — GitHub OAuth user-token PR pipeline with fix branches; signed GitHub App webhook.
- **Bill** — Stripe 4-tier plans (free/starter/growth/agency), webhooks with idempotency (`WebhookEvent`).
- **Enterprise** — SSO (SAML), SCIM 2.0 (Users + Groups), audit-log SIEM export (JSON/CSV/CEF), data residency, GDPR Art. 20 export, churn scoring.
- **i18n** — English + Hindi, 1491 keys each, parity-verified.

Target: agencies/SMBs and enterprise procurement teams needing ADA/WCAG evidence.

---

## 3. Stack (verified)

| Layer | Tech |
|---|---|
| Framework | Next.js **16.3.4** App Router, React 19, TypeScript 5.9 strict |
| Dev server | custom `custom-server-debug.js` (HMR upgrade handler) + Turbopack |
| DB | PostgreSQL 16 + Prisma **6.11** |
| Cache/queue | Redis 7 + BullMQ 5 |
| Auth | NextAuth v4 (JWT, 7d) + bcrypt + TOTP MFA (`otplib`) + SAML SSO |
| Payments | Stripe 22 |
| Scanner | Playwright + axe-core 4.8.4 (+ fetch/DOM strategies) |
| AI | OpenAI-compatible mesh: OpenRouter free + NVIDIA NIM free, circuit breaker, $0 accounting |
| UI | Tailwind 4 + shadcn/Radix (41 primitives, 115 component files) + framer-motion + recharts |
| i18n | next-intl 4.13 (en, hi), localePrefix `never` |
| Observability | Pino, Sentry, PagerDuty, PostHog (all optional/env-gated) |
| Tests | Vitest (401 collected) + Playwright (15 spec files) + k6 |
| Deploy | Docker standalone, GHCR, docker-compose (postgres/redis/app/worker) |

---

## 4. Runtime architecture

```
Browser / API client
        │
   middleware.ts  (next-auth withAuth; dashboard redirect; bearer passthrough)
        │
   Next App Router ── 25 pages (13 dashboard, 12 public/auth/marketing)
        │
   95 API route handlers
        │   guard order everywhere:
        │   rate limit → auth → email verified → org/project/scan/violation access → permission
        │
   Domain libs (src/lib, 54 files) ─ scan-executor, scheduler-daemon, queue,
        │                            github-pr, stripe webhook, scim, saml,
        │                            rbac, audit, crypto, plan-limits
        │
   PostgreSQL (17 models)   Redis (queue, rate limit, cache, daemons)
        │
   BullMQ scan worker (in-process via instrumentation.ts, or `npm run worker`)
   Scheduler daemon (60s tick: schedules, retention, churn, webhook prune)
```

**Split mode:** `DISABLE_BACKGROUND_WORKERS=true` on web + `docker compose --profile workers up --scale worker=N`.

---

## 5. Route inventory

**Pages (25):** landing, pricing, privacy, terms, status, share/[token], invite, verify-email, reset-password, forgot-password, register, login + dashboard, projects (list/[id]), scans (list/[id]), violations (list/[id]), reports (list/[id]), settings, team, admin, audit-logs.

**APIs (95 handlers)** grouped:
auth/session (11) · projects & import/verify (6) · scans & progress/SSE (4) · violations & export/batch (4) · remediation (2) · reports gener/list/share/vpat/exec (5) · stats & usage (5) · team/roles/invites (6) · billing/stripe (9) · github (8) · admin/sso/scim (12) · audit (2) · settings/region/consent/account (9) · health probes (4) · docs/legal/misc (7).

**Every route is guard-verified** by `src/app/api/__tests__/guard-parity.test.ts` (91 routes scanned, 16 documented public allowlist entries).

---

## 6. Data model (17 models)

`Organization` (plan, quota, currency, dataRegion, SSO config, churnScore) · `User` (role, customRole, MFA, GitHub token, verification) · `CustomRole` · `Project` (verification token, crawl/scan config, riskScore, schedule) · `Scan` · `Violation` (WCAG criteria, AI fix, confidence, PR URL) · `GithubConnection` · `AuditLog` · `PasswordReset` · `TeamInvite` · `ComplianceReport` · `ScheduledScan` · `WcagRule` · `ScimGroup` · `CookieConsent` · `WebhookEvent` · `ManualCheck`.

Soft deletes (`deletedAt`) on Project/Scan/Violation/Report; composite indexes tuned for org+status+severity queries.

---

## 7. 🔴 Release blocker — migration drift

`prisma/migrations/` contains 9 migrations. Baseline creates **12 tables**.

| Model | In schema | In migrations |
|---|---|---|
| CustomRole | ✅ | ✅ |
| WebhookEvent | ✅ | ✅ |
| **ScimGroup** | ✅ | ❌ MISSING |
| **CookieConsent** | ✅ | ❌ MISSING |
| **ManualCheck** | ✅ | ❌ MISSING |

Local dev works because the DB was built with `prisma db push`. A fresh environment running `npm run db:migrate:prod` (`prisma migrate deploy`) will be **missing these 3 tables** → SCIM Groups, cookie consent, and manual checks fail at runtime.

Also uncommitted: `Organization.pagesQuota` default changed `1000 → 100` (schema + quota fallbacks). Needs a migration too.

**Fix:** `npx prisma migrate dev --name add_scim_groups_consent_manual_checks` against the dev DB, review SQL, commit.

---

## 8. Security posture (design, code-verified)

- **Guard chain** enforced and regression-tested (`rbac.ts`: auth → verification → org/project/scan/violation → permission; 13 permissions).
- **Secrets at rest:** AES-256-GCM (`src/lib/crypto.ts`), production fails closed without `CRYPTO_SECRET_KEY`.
- **Webhooks:** Stripe signature + `WebhookEvent` idempotency; GitHub HMAC-SHA256; dead-org events consumed to stop retry storms.
- **OAuth state:** HMAC-signed, timing-safe compare, fails closed.
- **Headers:** CSP **enforced** with report-uri, HSTS, X-Frame DENY, COOP/CORP, Permissions-Policy.
- **Rate limits:** Redis with in-memory fallback, per-endpoint classes, headers on responses.
- **Known residual risk:** `middleware.ts` (proxy migration deferred with documented trigger), AI prompt-injection surface (documented mitigations in threat model).

---

## 9. Testing & CI

| Suite | State |
|---|---|
| Vitest unit/integration | 401 collected · 302 pass · 2 fail · 97 skip — **all 15 failing files are `P1001 can't reach DB`** |
| Playwright E2E | 15 specs (a11y, contrast, auth, dashboard, projects, settings, smoke, team, status…) — requires DB+Redis+dev server |
| k6 load | smoke / scan-flow / ai-remediate / soak |
| CI (`ci.yml`) | Postgres + Redis services → prisma push → constraints → lint → tsc → vitest |
| Workflows | ci, deploy, docker (Trivy+SBOM), load, release, accessguard (action) |
| Coverage gate | 55/50/58/57 |

**This session's evidence:** typecheck 0; i18n audit `MISSING_COUNT=0`; audit action labels `MISSING_LABELS=0` (56 actions). DB tests blocked by stopped Docker.

---

## 10. Deployment

- `Dockerfile` multi-stage standalone; `docker-entrypoint.sh`.
- `docker-compose`: postgres + redis + app (+ profile-gated worker, 4G cap, `SCAN_WORKER_CONCURRENCY`).
- Docs: `docs/DEPLOYMENT.md`, `docs/devops/*`, `docs/launch/PRODUCTION_CHECKLIST`.
- **Gate:** fix §7 before any fresh-environment deploy. Existing DBs built via `db push` are fine.

---

## 11. Current working tree (uncommitted WIP)

**Theme:** finishing pass — i18n gaps, honesty/de-slop, detail-page API correctness, operational hardening.

Changes worth knowing:
- **New** `GET /api/scans/[id]`, `GET /api/violations/[id]` (org-scoped, rate-limited, new `requireViolationAccess` guard). Detail pages stop fetching 100–200 rows and filtering client-side.
- `GET /api/violations?scanId=` now guarded by `requireScanAccess`.
- i18n: `getRiskLabelKey`, `formatDate(locale)`, `formatRelativeTime(strings)`, `common.fallbackUser`.
- Quota default `1000 → 100` (schema + two fallbacks) — aligned with free plan.
- Plan limits deduplicated to canonical `src/lib/plan-limits.ts` (→ `stripe.ts` PRICING_PLANS).
- Email: no more silent "demo mode success"; dev-only token exposure helper; production fails loudly.
- Redis: cold-start `connect()` before `ping()` in `/api/health`.
- Queue: stale jobs (deleted project/org) drained instead of retried forever.
- HMR: custom server forwards `upgrade` events; `allowedDevOrigins`.
- Deleted: `opencode.json` (local MCP config), `e2e/debug-overlay.spec.ts`.

**Not committed, not pushed. `main` is in sync with `origin/main` (0 ahead / 0 behind).**

---

## 12. Verification log (this session)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc -p tsconfig.check.json --noEmit` | **PASS** (exit 0) |
| i18n parity | `node scripts/i18n-audit.mjs` | **PASS** (`MISSING_COUNT=0`) |
| Audit labels | `node scripts/audit-actions-diff.mjs` | **PASS** (`MISSING_LABELS=0`, 56 actions) |
| Vitest | `npx vitest run` | 302 pass · 2 fail · 97 skip — **DB down** |
| Build | `npm run build` | **PASS** (exit 0) |

---

## 13. Ranked risks

| # | Risk | Sev | Action |
|---|---|---|---|
| 1 | 3 models missing from migrations → fresh prod deploy breaks | 🔴 HIGH | Generate migration, test on clean DB |
| 2 | 57-file uncommitted diff (i18n + API + schema) can rot/conflict | 🟠 MED | Verify + commit in coherent slices |
| 3 | Docker stopped → no DB/Redis → cannot run tests, e2e, app | 🟠 MED | `Start-Service com.docker.service` / Docker Desktop |
| 4 | `opencode.json` deletion removes local MCP config | 🟡 LOW | Restore or commit intentionally |
| 5 | Docs drift: VOLUMES says V21–V22 done, AGENTS says V14–V20; ACCESSGUARD_REPORT claims 383 tests vs 401 now; ROADMAP dated 2026-08-29 | 🟡 LOW | One docs-sync pass |
| 6 | `package.json#prisma` config deprecated (Prisma 7) | 🟢 LOW | Migrate to `prisma.config.ts` later |
| 7 | Legacy dirs at root (`hive/`, spec files marked STALE) add noise | 🟢 LOW | Archive when convenient |

---

## 14. Recommended next actions (in order)

1. **Start Docker Desktop** (`com.docker.service`), `docker compose up -d postgres redis` → rerun vitest to get a true 401/401 signal.
2. **Generate the missing migration** (ScimGroup, CookieConsent, ManualCheck, quota default) and verify `migrate deploy` on an empty database.
3. **Commit the WIP in slices** (`vol:` messages): API detail routes + guards → i18n/format helpers → quota/plan limits → ops hardening → deletions.
4. **Sync docs**: VOLUMES status, `ACCESSGUARD_REPORT.md` numbers, AGENTS current-status line.
5. Only then: E2E smoke + `npm run build`, and decide deploy.

---

*Read-only audit. No application code was modified. State mirrored in `.ai/STATE.md`.*
