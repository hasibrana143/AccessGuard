# AccessGuard — Test Status

Last run: 2026-11-20 (CTO audit)

## Vitest

```
Test Files  15 failed | 28 passed (43)
Tests       2 failed | 302 passed | 97 skipped (401)
```

All 15 failing files fail with `PrismaClientInitializationError: Can't reach database server at localhost:5432`.
No logic failures observed. Baseline recorded in docs: 403/403 green with DB up.

## Typecheck

```
npx tsc -p tsconfig.check.json --noEmit   → exit 0 (PASS)
```

## i18n / audit guards

```
node scripts/i18n-audit.mjs            → MISSING_COUNT=0
node scripts/audit-actions-diff.mjs    → MISSING_LABELS=0 (TOTAL_ACTIONS=56)
```

## Build

```
npm run build   → exit 0 (PASS) — Next 16 standalone, all 25 pages + 95 handlers compiled
```

## Not run (blocked)

- Playwright E2E (15 specs) — needs Postgres + Redis + dev server
- k6 load (smoke/scan-flow/ai-remediate/soak) — needs running stack

## How to reproduce green

```powershell
Start-Service com.docker.service      # Docker Desktop
docker compose up -d postgres redis
npx prisma db push
npx vitest run
npm run dev                            # separate terminal
npm run test:e2e
```
