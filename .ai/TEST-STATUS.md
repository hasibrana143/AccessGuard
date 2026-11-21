# AccessGuard — Test Status

Last run: 2026-11-21 (authenticated scans cycle)

## Vitest

```
Test Files  44 passed (44)
Tests       407 passed (407)
Duration    ~12.9s
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

## Not run (blocked)

- Playwright E2E — needs the dev server on :3000; the touched API paths are covered by vitest
  route tests instead.
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
