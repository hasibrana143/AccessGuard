# Volume 4 — Build System & CI

## 1. Local build
- `next.config.ts`: `output: "standalone"`, image optimization, custom security headers (V6),
  `/share/[token]` rewrite, Sentry instrumentation.
- `npm run build` = `next build` + copies `.next/static` and `public` into `standalone`.
- `npm start` runs the standalone server with `NODE_ENV=production`.

## 2. Container image (Dockerfile, multi-stage)
- `builder`: `node:22-alpine` → `npm ci`, `next build`, prisma generate.
- `runner`: `node:22-alpine`, **slim user**, copies:
  - `.next/standalone` + `.next/static` + `public`
  - `prisma/` (schema + migrations) and `node_modules/.prisma`
  - `docker-entrypoint.sh` → runs `prisma migrate deploy` at boot, then `node server.js`.
- Dev container (docker-compose): `postgres:16-alpine` + `redis:7-alpine`, healthcheck-gated; image builds app too.

## 3. CI (`.github/workflows/ci.yml`) — on PRs and pushes to main
1. `npm ci` (cache node_modules)
2. `npm run lint`
3. `vitest run` (+ coverage artifact)
4. `npm run build`
5. `npm audit --audit-level=high`
6. Playwright e2e (installs chromium; uses Postgres + Redis services)

## 4. Release images (`.github/workflows/docker.yml`)
- On `main` + `v*` tags: build image, push to GHCR (`ghcr.io/<owner>/accessguard`), tag `latest` / `v*`.

## 5. Runtime observability
- Sentry (`sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`) for errors/performance.
- Structured app logs via `src/lib/error-logger.ts`; audit events in DB (`AuditLog`).

## 6. Notes & known caveats
- **Typecheck**: `tsconfig.json` includes `.next`; generated route types can go stale/corrupt
  (seen when two dev servers ran concurrently). Reliable check:
  `npx tsc -p tsconfig.check.json` (a temp config extending the base but including only `src/`).
- Run `npm run build` with the dev server stopped (`.next` contention).
- Keep `npm audit` green — CI fails on high+ findings.