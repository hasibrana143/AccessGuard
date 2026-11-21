# Deployment Runbook (Vercel)

The `deploy.yml` workflow ships every push to `main` to **production** and every
PR to a **preview** URL. It is secret-gated: without credentials it logs a notice
and skips — CI (`ci.yml`) remains the only required gate.

## 1. One-time setup

1. Create the project on Vercel (import the GitHub repo, framework: Next.js,
   build command/output are provided by `vercel build`).
2. Add three repo secrets (Settings → Secrets and variables → Actions):
   - `VERCEL_TOKEN` — Vercel dashboard → Settings → Tokens
   - `VERCEL_ORG_ID` — project → Settings → General
   - `VERCEL_PROJECT_ID` — same page
3. Configure env vars on Vercel (Production + Preview scopes) from `.env.example`:
   - Required: `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
     `SCHEDULER_API_KEY`
   - Error tracking: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`,
     `SENTRY_PROJECT`
   - Do NOT set `APP_VERSION` on Vercel — CI injects the git SHA at build time.

## 2. Data services

| Service | Suggested provider | Notes |
| --- | --- | --- |
| Postgres | Neon / Supabase / Vercel Postgres | Connection string must include `?sslmode=require` if provider demands it; run `prisma migrate`/`db push` against it once before first deploy |
| Redis | Upstash | Set `REDIS_URL` to the TLS URL (`rediss://…`) |

## 3. What CI does per deploy

1. `vercel pull` — fetches linked project env into `.vercel/`
2. `vercel build` — full Next standalone build with remote env vars;
   `APP_VERSION` is set to `${{ github.sha }}` so `/api/health` reports the
   deployed commit
3. `vercel deploy --prebuilt` — uploads the prebuilt output (no rebuild on
   their side, deterministic artifact)

## 4. Health & rollback

- Health probe: `GET /api/health` returns `200 {status: healthy, version, uptimeSeconds, checks{database, redis}}`
  or `503` when database/redis fail. Point an uptime monitor (UptimeRobot,
  Better Stack) at it.
- Rollback: `npx vercel rollback <deployment-url> --token $VERCEL_TOKEN`
  or promote the previous deployment from the Vercel dashboard.

## 5. Preview deployments

Every PR gets an isolated preview URL using the Preview-scoped env vars. Use a
separate preview database (or branch DBs on Neon) so previews never touch prod
data. Seeded preview logins should be throwaway credentials only.

## 6. The CI pipelines (GitHub Actions)

| Workflow | Trigger | What it does | Required? |
| --- | --- | --- | --- |
| `ci.yml` | push / PR to `main` | Postgres + Redis services, Prisma generate/push/constraints/seed, lint, Chromium install, `vitest run --coverage`, `next build`, `npm audit --audit-level=high`, Playwright E2E | **yes** — the gate |
| `deploy.yml` | push / PR to `main` | Vercel build + deploy (production on push, preview on PR). Secret-gated: without `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` it logs a notice and skips | no (skips without creds) |
| `docker.yml` | push to `main`, `v*` tag | Builds and pushes the GHCR image (multi-arch), runs Trivy on the image | no (release path) |
| `accessguard.yml` | push / PR to `main`, `develop` | AccessGuard scans its own repository through its **public API** (`POST /api/v1/scans`, `GET /api/v1/reports/vpat`). Needs the `ACCESSGUARD_API_KEY` + `ACCESSGUARD_PROJECT_ID` secrets; without them the steps are skipped with a notice | no (dogfooding) |
| `load.yml` | manual dispatch, weekly cron | k6 load scenarios against a locally built and started server | no (weekly) |
| `release.yml` | `v*` tag | Builds a changelog from the conventional commits and creates the GitHub Release | no (tag path) |

### Build-time environment

Next.js collects the route configuration at **build time**, and the auth module
throws when `NEXTAUTH_SECRET` is missing. Every build therefore needs the
variables below — but **no reachable database** (the build only reads them):

| Workflow | Where | How |
| --- | --- | --- |
| `ci.yml` | workflow-level `env` | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL` (test database) |
| `docker.yml` | `Dockerfile` build stage | An **ephemeral** secret generated inside the build stage (`openssl rand -hex 64`), the public URL and a placeholder `DATABASE_URL`. The secret never leaves the build stage and is never baked into an image layer — the real values come from the runtime environment. |
| `load.yml` | build step `env` | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `DATABASE_URL` (the test database) |
| `deploy.yml` | Vercel build | The project env pulled by `vercel pull` |

### The image scan

`docker.yml` scans the pushed image with Trivy and **fails the job on HIGH or
CRITICAL**. Two details matter when the step behaves unexpectedly:

- The image reference must be lowercase. The workflow resolves it once
  (`ghcr.io/<owner>/<repo>:main-<sha>`) and reuses it for the scan and the SBOM
  attestation; `github.repository` keeps the repository's original case, which
  Trivy refuses to parse.
- `trivy-action` **drops the severity filter when the output format is SARIF**
  (the report is meant to carry every severity), and the exit code then counts
  every finding — a MEDIUM finding fails the job. The scan therefore sets
  `limit-severities-for-sarif: true`, which keeps the filter for both the report
  and the exit code.

The scanner itself is pinned (`version: v0.76.2`); the action's default
(`v0.70.0`) has known path traversal advisories.

## 7. Status of deferred items after this

- ✅ deploy/preview jobs — this workflow (was deferred in V7)
- ⏳ semantic-release — still manual versioning via VERSION/CHANGELOG
- ⏳ status page / PagerDuty — point monitors at `/api/health`; paging setup
  remains external by choice
