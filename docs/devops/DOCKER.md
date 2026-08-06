# Volume 7 — Docker Architecture

## 1. Multi-stage Dockerfile (verified)

**Stage 1 — Builder** (`node:22-alpine`)
- Installs `openssl` (Prisma requirement)
- `npm ci` (exact lockfile)
- Copies full source, runs `prisma generate`
- `npm run build` → produces `.next/standalone`

**Stage 2 — Runner** (`node:22-alpine`)
- Installs runtime deps: `openssl chromium nss freetype freetype-dev harfbuzz ca-certificates ttf-freefont`
- Sets Puppeteer env: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`, `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- Creates non-root user `nextjs` (UID 1001)
- Copies from builder:
  - `.next/standalone` → app root
  - `.next/static` → `.next/static`
  - `public/` → `public/`
  - `prisma/` → `prisma/` (schema + migrations)
  - `node_modules/.prisma` → `node_modules/.prisma`
  - `package.json`
- Copies `docker-entrypoint.sh` → `/usr/local/bin/`, `chmod +x`
- `USER nextjs`, `EXPOSE 3000`, `ENTRYPOINT ["docker-entrypoint.sh"]`, `CMD ["node", "server.js"]`

## 2. Entry point (`docker-entrypoint.sh`)
- `set -e`
- Runs `npx prisma migrate deploy` (blocks on failure, suggests `db push` as last resort)
- `exec "$@"` → hands off to `node server.js`

## 3. Docker Compose (local dev + single-host prod)
```yaml
services:
  postgres:   postgres:16-alpine, healthcheck pg_isready, volume postgres_data
  redis:      redis:7-alpine, healthcheck redis-cli ping
  app:        build: ., ports 3000:3000, env from .env, depends_on healthy postgres+redis
```
- `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `LOG_LEVEL` injected
- `NEXTAUTH_SECRET` has fallback but **must be overridden in prod** (fail-closed via V6 oauth-state)

## 4. Image facts
- Base: `node:22-alpine` (both stages) — matches `.nvmrc`
- Size optimisation: standalone output, no dev deps in runner, layer caching via `package.json` copy first
- Chromium for Puppeteer bundled in runner (~120 MB added)
- GHCR publishing via `docker.yml` on `main` + `v*` tags (semver + sha + latest)

## 5. Gaps / hardening items
| Area | Current | Target |
| --- | --- | --- |
| Base image scan | none in CI | Trivy/Snyk in docker.yml |
| SBOM | none | `syft` in build, upload to GHCR |
| Multi-arch | amd64 only | buildx `linux/amd64,linux/arm64` |
| Runtime user | `nextjs` non-root ✅ | keep |
| Read-only rootfs | no | add `readOnlyRootFilesystem: true` in K8s |
| Health endpoint | none | add `/api/health` (liveness/readiness) |