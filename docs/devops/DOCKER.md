# Volume 7 — Docker Architecture

## 1. Multi-stage Dockerfile (verified)

**Stage 1 — Builder** (`node:22-alpine`)
- Installs `openssl` (Prisma requirement)
- `npm ci` (exact lockfile)
- Copies full source, runs `prisma generate`
- `npm run build` → produces `.next/standalone`
- The build sets the env vars the route collection reads: an **ephemeral**
  `NEXTAUTH_SECRET` (generated inside the build stage with `openssl rand -hex 64`,
  never stored, never part of the image), the public `NEXTAUTH_URL` and a
  placeholder `DATABASE_URL`. The build needs **no reachable database**; the real
  values come from the runtime environment. Without the secret the build fails at
  the first route that touches the auth module.

**Stage 2 — Runner** (`node:22-alpine`)
- Installs runtime deps: `openssl chromium nss freetype freetype-dev harfbuzz ca-certificates ttf-freefont`
- Upgrades `libxml2` to the newest version the Alpine repository offers: the Alpine
  packages the base image was built with can lag behind an advisory, and the Trivy gate
  in `docker.yml` fails on the HIGH CVEs in the OS packages (CVE-2026-86138,
  CVE-2026-86139, CVE-2026-86140, CVE-2026-86142, CVE-2026-86143, CVE-2026-11979).
  The upgrade always takes the newest package the repository offers, so the image ships
  the fixed `libxml2` instead of the one the base image froze. The base image digest
  alone does not protect against this: the package repository is read at build time.
- Upgrades npm to `12.2.3`: the base image's npm 11 bundles packages with known
  HIGH CVEs (pacote, sigstore, picomatch, ip-address, brace-expansion) and the
  Trivy gate in `docker.yml` fails on them. npm 12.2.3 bundles fixed versions and
  needs Node ≥ 22.22.2 (`node:22-alpine` ships 22.23.5). Only the runner is
  upgraded — the builder keeps the base npm.
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
| Base image scan | Trivy in `docker.yml` (`aquasecurity/trivy-action@v0.36.0`, scanner pinned to `v0.76.2`), fails the job on HIGH/CRITICAL, SARIF uploaded to code scanning. The scan sets `limit-severities-for-sarif: true` — without it the action drops the severity filter in SARIF mode and the exit code counts every severity, so a MEDIUM finding fails the job | keep — re-pin when the action releases a new major; re-check the SARIF severity behaviour on every re-pin |
| SBOM | `anchore/sbom-action@v0.17.3` attests an SBOM to GHCR on every `main` push | keep |
| Multi-arch | buildx `linux/amd64,linux/arm64` with the GitHub Actions build cache | keep |
| Runtime user | `nextjs` non-root ✅ | keep |
| Read-only rootfs | no | add `readOnlyRootFilesystem: true` in K8s |
| Health endpoint | `/api/health` (liveness/readiness) ✅ | keep |

### The image reference is lowercase

A registry reference must be lowercase. `github.repository` keeps the
repository's original case (`hasibrana143/AccessGuard`), which the metadata
action lowercases internally when it pushes — so the workflow pushes
`ghcr.io/hasibrana143/accessguard:main-<sha>`. The scan steps must use the same
reference: the workflow resolves it once (lowercase repository path + the sha
tag that was pushed) and hands it to both the Trivy scan and the Syft
attestation. Pointing Trivy at the uppercase name makes it fail with
`could not parse reference` — the scan never runs.