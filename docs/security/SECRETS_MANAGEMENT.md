# Volume 6 — Secrets Management

## 1. Inventory (`.env` / `.env.example`, no values in repo)

| Variable | Purpose | Exposure |
| --- | --- | --- |
| `DATABASE_URL` | Postgres DSN | server-only |
| `NEXTAUTH_SECRET` | JWT/state signing | server-only |
| `NEXTAUTH_URL` | canonical app URL | server-only |
| `REDIS_URL` | BullMQ/cache | server-only |
| `SCHEDULER_API_KEY` | `/api/schedule/process` | server-only |
| `GITHUB_CLIENT_ID/SECRET` | repo integration OAuth | server-only |
| `GOOGLE_CLIENT_ID/SECRET` | NextAuth OAuth | server-only |
| `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` | billing | server-only |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | remediation LLM | server-only |
| `RESEND_API_KEY`, `EMAIL_FROM` | transactional mail | server-only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (+ price IDs) | checkout | client (safe, publishable) |
| `SENTRY_DSN` (+ ORG/PROJECT) | error tracking | server (DSN public-safe) |
| `ALLOWED_ORIGINS`, `FLAG_CACHE_TTL`, `LOG_LEVEL` | config | server |

## 2. Rules enforced
1. **No secrets in client bundle** — zero `NEXT_PUBLIC_` secret usage; verified by grep in audit rounds.
2. **No hardcoded fallback secrets** — V6 fix removed the OAuth-state constant
   (`accessguard-oauth-state-secret`); signing fails closed if unset.
3. `.env` gitignored (`.gitignore`), `.env.example` documents names only.
4. Server-only reads via `process.env` in route/lib modules; never logged (`error-logger`
   redacts — verify on rotate).
5. Third-party tokens at rest AES-GCM encrypted (see ENCRYPTION).

## 3. Rotation & CI
- GH Actions secrets used in `ci.yml`/`docker.yml` (npm/playwright steps); no inline creds.
- Rotation runbook pending (V7): rotate `NEXTAUTH_SECRET` → tokens invalidate gracefully
  (re-login only); Stripe webhook secret → update endpoint config; AI key → update env + restart.