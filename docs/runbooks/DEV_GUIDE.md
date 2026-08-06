# Volume 9 — Developer Guide

Onboarding + extension guide for engineers. Read `docs/development/*` first (folder structure,
coding standards, environment setup).

## 1. Local setup (summary)
```bash
nvm use            # Node 22 (.nvmrc)
npm ci
docker compose up -d           # Postgres 16 + Redis 7
cp .env.example .env           # fill secrets (see ENVIRONMENT_SETUP.md)
npm run db:generate
npm run db:migrate:prod
npm run db:seed                # 1 admin, 2 orgs, 13 projects, 17 scans
npm run dev                    # :3000 — ONE instance only
```
**Typecheck**: `tsconfig.json` includes `.next` (can be corrupt by a running dev server).
Use source-only check: temp `tsconfig.check.json` (include `src`, exclude `.next`) →
`npx tsc -p tsconfig.check.json`.

## 2. Repo map (quick)
| Path | What |
|---|---|
| `src/app/api/**/route.ts` | 63 REST handlers |
| `src/app/(dashboard)/**` | Authenticated app pages |
| `src/lib/` | Server libs: `db`, `auth`, `rbac` (14 perms), `queue` (BullMQ), `audit`, `rate-limit`, `plan-limits`, `openapi` |
| `src/ai/` | Prompt library, model router, cost accounting (V5) |
| `src/services/scanner/` | Puppeteer+axe-core + fetch/dom strategies |
| `src/components/ui/` | 48 shadcn/Radix primitives |
| `prisma/` | Schema (13 models), migrations, seed, check-constraints.sql |
| `e2e/` | Playwright (11 files / 80 tests) |
| `tests/` | (roadmap) integration + security + load suites — see docs/qa |

## 3. Add a new API endpoint (checklist)
1. Create `src/app/api/<domain>/route.ts` with method handlers.
2. **Guard chain first**: `requireVerifiedEmail(request, { permission: 'X' })` +
   org-scoped query + rate limit (see `src/lib/rbac.ts`).
3. Validate inputs (zod-ish manual); return `{ error: { code, message } }` on failure.
4. New audit events → add to the whitelist type in `src/lib/audit.ts` (hard rule).
5. If AI: never block on LLM failure — template fallback; report `costEstimate`.
6. Test: `src/app/api/<domain>/route.test.ts` (mock session, real Prisma via transaction).
7. If the endpoint is public/stable, add it to `src/lib/openapi.ts` (V9 gap: only 9/63 paths).
8. Update `docs/runbooks/API_REFERENCE.md` inventory.

## 4. Add a page/component
1. Route group: `(dashboard)` for app views; public pages at top level.
2. Pages are `'use client'`; data via `useApi`/React Query (org-namespaced keys).
3. Tokens only (Tailwind v4); icons from lucide-react; reuse `src/components/ui/*`.
4. Dark mode: semantic tokens, `dark:` only for intentional exceptions.

## 5. Testing
| Command | Scope |
|---|---|
| `npm test` | vitest (234 tests, 22 files) |
| `npm run lint` | eslint (0 errors gate) |
| `npx tsc -p tsconfig.check.json` | source typecheck |
| `npm run test:e2e` | Playwright (80 tests) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run db:backup:prune` | DB backup + retention |

- New logic → vitest next to code (`__tests__/`); user flows → `e2e/` (a11y for pages).
- Coverage threshold: 40% (raising per V8 roadmap — target 75% lines).

## 6. Git workflow
- Commit: `vol: <area> — V<n>: <summary>` (see GIT_WORKFLOW.md).
- PR to `main`; CI gates: lint, vitest, build, audit, e2e.
- Never commit `.env`, `*.log`, secrets. `npm ci` only for installs.

## 7. Common pitfalls (learned)
- **Two dev servers** → `.next` type corruption → source-only typecheck workaround (above).
- **Prisma generate** after schema changes; never `db push` on shared prod DBs.
- **Rate limits** trip in tests → use `LOG_LEVEL=error` + distinct emails.
- **Scanner in e2e** — example.com scans are slow/flaky; prefer seeded fixtures.