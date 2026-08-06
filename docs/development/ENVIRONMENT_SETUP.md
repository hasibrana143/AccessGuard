# Volume 4 — Environment Setup (developer onboarding)

## 1. Prerequisites
- **Node 22.x** (`.nvmrc` = `22`; Dockerfile uses `node:22-alpine`). No engines field → set via nvm manually.
- **npm** (lockfile: `package-lock.json`; never use yarn/pnpm for installs).
- Docker (for Postgres 16 + Redis 7 containers) — required for dev.
- Optional: Playwright browsers for e2e (`npx playwright install` after `npm ci`).

## 2. One-time bootstrap
```bash
nvm use            # Node 22 (per .nvmrc)
npm ci             # exact lockfile install
docker compose up -d --build   # postgres:16-alpine + redis:7-alpine (healthchecks pass first)
cp .env.example .env
#   fill: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, OAUTH_STATE_SECRET,
#         GITHUB_* (OAuth app), ANTHROPIC_/AI keys (optional), NEXT_PUBLIC_STRIPE_*, SENTRY_*
npm run db:generate
npm run db:migrate:prod    # applies migrations (non-interactive)
npm run db:seed            # 1 admin user / 2 orgs / 13 projects / 17 scans
npm run db:constraints     # applies DB-level check constraints (idempotent)
```

## 3. Daily commands
```bash
npm run dev            # Next dev on :3000  (START ONE INSTANCE ONLY — see §5)
npm test               # vitest run — expect 234 passing
npm run lint           # eslint ., 0 errors
npm run test:e2e       # Playwright full suite
npm run db:backup / db:restore   # managed dumps
```

## 4. Troubleshooting
| Symptom | Fix |
| --- | --- |
| `connect ECONNREFUSED` 5432/6379 | `docker compose up -d`; wait for healthchecks |
| Prisma "no migrations" | run `db:migrate:prod` (never `db:push` for shared schema) |
| 401 on login | session secret mismatch → set `NEXTAUTH_SECRET`/`OAUTH_STATE_SECRET` (both required, fail-closed) |
| Typecheck noise from `.next` types | see BUILD_SYSTEM §Notes — do a source-only check |

## 5. Rules
- **One dev server per `.next`**: concurrent Next dev processes corrupt generated types.
- Never commit `.env`, `*.log`, `.next/`.
- Use `npm ci` (clean install) — never `npm install` on a shared machine by default.