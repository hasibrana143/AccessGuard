# Volume 3 — CI/CD Integration

## 1. Pipelines (2 GitHub Actions workflows)

### `ci.yml` — build & test on push/PR → main
1. **Services**: `postgres:16-alpine` + `redis:7-alpine` (GitHub-hosted).
2. `npm ci` → `prisma generate` → `prisma db push --skip-generate` → `npm run db:constraints`
   → `npm run db:seed` (boilerplate owner-demo + WCAG rules).
3. `npm run lint` (eslint).
4. `npx vitest run --coverage` (19 files; v8 coverage threshold 40%).
5. `npm run build` (includes tsc via Next).
6. `npm audit --audit-level=high`.
7. `npx playwright install chromium` → `npm run test:e2e` (11 specs / 44 tests,
   own webServer). Playwright artifacts (report) uploaded **on failure**.

### `docker.yml` — image publish
- On push to `main` + tags `v*`, builds and pushes `ghcr.io/<owner>/accessguard` with
  `gha` cache (actions/cache). No deploy step.

## 2. Container runtime

- **Dockerfile** (multi-stage, `node:22-alpine`): `prisma generate`; install Chromium + Puppeteer
  deps (`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`, `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`);
  non-root `nextjs` user; copies `.next/standalone` + static + public; entry `docker-entrypoint.sh`
  → `prisma migrate deploy` then `node server.js`.
- **docker-compose.yml**: `postgres:16-alpine` (port 5432, volume `postgres_data`, healthcheck),
  `redis:7-alpine` (6379, healthcheck), `app` (3000, env `DATABASE_URL/NEXTAUTH_* /REDIS_URL/LOG_LEVEL`,
  depends_on both healthy).

## 3. Deploy surface
- Image pushed to GHCR; deployment is Docker standalone (no Vercel, no vercel.json).
- Local: `docker compose up`; fly Client install as needed (see ops runbooks when added).

## 4. Tooling scripts (package.json, 21)

dev (next dev -p 3000), build (standalone copy step), start (bun `server.js`), test/test:watch,
lint, db:push/genenerate/migrate/reset/seed/constraints/migrate:prod/push:dev/push:prod,
test:e2e / :setup / :ui, db:backup(+prune) / db:restore (via `scripts/db-backup.mjs`).

## 5. Gaps (explicit — track in V7 DevOps)

1. **No deploy job** — GHCR images are produced; no k8s/EC2/Render sync.
2. **No separate tsc check** (build covers it) and **no lint/ts in a matrix**.
3. **No load/perf/security gates** in CI (no k6/OWASP ZAP; k6 not present anywhere).
4. E2E runs full chromium download each push (time); setup uses `playwright\auth` storage, but
   `test:e2e:setup` is not invoked in CI — recommend consolidating to a single command.
5. Secrets: workflows must use GH Actions secrets (NEXTAUTH_SECRET, AI key etc.); local uses `.env`.