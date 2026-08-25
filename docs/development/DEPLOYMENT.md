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

## 6. Status of deferred items after this

- ✅ deploy/preview jobs — this workflow (was deferred in V7)
- ⏳ semantic-release — still manual versioning via VERSION/CHANGELOG
- ⏳ status page / PagerDuty — point monitors at `/api/health`; paging setup
  remains external by choice
