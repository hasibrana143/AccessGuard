# AccessGuard — Current State

| Field | Value |
|---|---|
| Current phase | P0 BUILD — Scanner truth ✅ → Violation lifecycle ✅ → Migrations ✅ (file ready) → Crawler v1 (Task 4) 🔄 |
| Current task | Crawler v1 — sitemap + BFS + Playwright render |
| Owner | CTO agent |
| Status | AMBER — Core scan engine fixed; migrations file ready; DB blocked on Docker |
| Blocked | DB/Redis down (Docker Desktop service stopped) → vitest/e2e/dev server blocked |
| Next action | Task 4: Crawler v1 implementation (sitemap discovery + BFS + per-page results) |
| Last verification | 2026-11-20 |

**Product verdict:** `.ai/PRODUCT-CRITIQUE.md` — scan is single-URL (not a crawler), GitHub Action calls dead endpoints, pricing "daily × pages" math impossible, no real trial. Fix these before selling. Execution plan: `.ai/TASKS.md`.

## Evidence (2026-11-20)

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.check.json --noEmit` | PASS (exit 0) |
| `node scripts/i18n-audit.mjs` | PASS — 0 missing keys (1491/1491) |
| `node scripts/audit-actions-diff.mjs` | PASS — 0 missing labels (56 actions) |
| `npx vitest run` | 302 pass / 2 fail / 97 skip / 15 files error — all P1001 DB unreachable |
| `npm run build` | PASS (exit 0) — Next 16 standalone build, all 25 pages + 95 handlers compiled |
| `git status` | dirty: 57 M, 2 untracked route dirs, 3 deleted |
| `git rev-list origin/main...HEAD` | 0 ahead / 0 behind |

## Open blockers

1. **Migration drift** — `ScimGroup`, `CookieConsent`, `ManualCheck` exist in `prisma/schema.prisma` but in no migration. `prisma migrate deploy` on a fresh DB omits them. Uncommitted `pagesQuota` default change also needs a migration.
2. **Docker stopped** — no Postgres:5432 / Redis:6379, so DB-dependent tests and E2E cannot run.
3. **Uncommitted WIP** — API detail routes (`scans/[id]`, `violations/[id]`), i18n/format helpers, quota defaults, ops hardening, `opencode.json` deletion.

## Next 3 actions

1. `Start-Service com.docker.service` (or open Docker Desktop) → `docker compose up -d postgres redis` → `npx vitest run`.
2. `npx prisma migrate dev --name add_scim_groups_consent_manual_checks` → test `prisma migrate deploy` on empty DB.
3. Commit WIP in coherent slices with `vol: <area> — <summary>` messages; push; sync docs numbers.
