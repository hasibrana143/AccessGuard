# AccessGuard — Test Status

Last run: 2026-11-21 (authenticated scans cycle)

## Vitest

```
Test Files  45 passed (45)
Tests       410 passed (410)
Duration    ~11.0s
```

New coverage in this cycle:

- `src/app/api/scan-auth/route.test.ts` (6 tests) — 401 without session, 403 for members,
  404 across organizations, encryption at rest, masked reads, update, delete.
- `src/app/api/onboarding/onboarding-rate-limit.test.ts` (3 tests) — 5/min limit, per-client
  scope, shared budget between `/onboarding/scan` and `/onboarding/vpat`.

Repaired (stale or broken fixtures, not product regressions):

| Suite | Root cause |
|---|---|
| `rbac.test.ts` | `db.user.findUnique` mock returned only `{ emailVerifiedAt }`; `requireAuth` re-reads id/role/orgId from the database → 401/403. The mock now mirrors the session row. |
| `queue.test.ts` | The database mock missed `scanAuthConfig.findMany`, `scan.findFirst`, `violation.findMany` and `$transaction` after the executor started reading auth configs. |
| `projects` / `violations` route tests | Both suites upserted the same e-mail into different organizations → whichever ran first decided the user's org. Unique e-mails + deterministic upserts now. |
| `tenant-isolation.test.ts` | The session referenced a fabricated user id (`u-a`) that does not exist in the database → 401 instead of 403. A real org-A user is created now. |
| `notification-settings.test.ts` | The test asserted 2 alert keys; the alerts feature ships 4 (`newCritical`, `newSerious` added). |
| `audit-whitelist.test.ts` | The regex matched every `action:` property, including `IntegrationLog.action`. It now anchors on audit writes only. |
| `openapi-parity.test.ts` | 13 route handlers were missing from the spec and the schema count had drifted. The spec now covers all 112 paths / 70 schemas. |
| `manual-checks` route test | The database was missing `ManualCheck.evidence` (db push drift) — fixed by the migration repair. |

## Typecheck

```
npx tsc -p tsconfig.check.json --noEmit   → exit 0 (PASS)
```

## Lint

```
npm run lint   → exit 0 (PASS, 0 errors)
```

## i18n / audit guards

```
node scripts/audit-actions-diff.mjs   → MISSING_LABELS=0 (TOTAL_ACTIONS=65)
en/hi key parity                       → 1500 keys, 0 missing
```

## Build

```
npm run build   → exit 0 (PASS) — Next 16.4.6, 116/116 static pages, standalone build
```

## Database

```
prisma migrate deploy (fresh DB)                → all 13 migrations applied
prisma migrate diff fresh DB → schema.prisma    → "No difference detected"
prisma migrate diff dev DB   → schema.prisma    → "No difference detected"
```

## Playwright E2E

```
npx playwright test --project=chromium   → 70 passed, 9 failed (7.7 min)
```

All 9 failures are **pre-existing** — none of the failed specs touch a path changed in this
cycle, and the failing surfaces (CSS tokens, landing page, settings privacy tab) were not
modified by these commits (`git diff a91e18e..HEAD -- src/app/globals.css src/app/page.tsx
src/app/settings` is empty).

| Failing spec | Root cause |
|---|---|
| `a11y.spec.ts` dashboard + violations (2) | axe contrast: `#e62b34` (coral) on `#0d0d0d` / `#261415` at 12px normal → 4.4:1 and 3.98:1, required 4.5:1. The token was last changed in `425cd37` (V20). |
| `contrast.spec.ts` dashboard/projects/violations light + dark (6) | Same coral token against the light and dark surface tokens. |
| `landing.spec.ts` start button (1) | Stale expectation: the landing page intentionally routes authenticated visitors to `/dashboard` (`src/app/page.tsx:25`), but the spec expects `/auth/login` while the whole chromium project runs with an authenticated storage state. |
| `settings.spec.ts` privacy tab (1) | The privacy tab no longer contains the expected “Export My Data / Data Region / EU” copy on first paint. |

Follow-up opened in `.ai/TASKS.md` (contrast token pass + e2e expectation repair). The APIs
touched in this cycle (scan-auth, onboarding) are covered by vitest contract tests instead.

## Not run (blocked)

- k6 load suites — need the full running stack.
- Strix pentest — CLI/cloud not installed in this environment (manual review recorded in
  `.ai/SECURITY-STATUS.md`).

## How to reproduce green

```powershell
docker compose up -d postgres redis
npx prisma migrate deploy
npx vitest run
npx tsc -p tsconfig.check.json --noEmit
npm run lint
npm run build
```
