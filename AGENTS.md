# Agent Working Agreement (AGENTS.md)

This repo is built in **12 volumes** (see `docs/VOLUMES.md`). Every change belongs to a volume.

## Ground truth
- `docs/` is the system of record: `product/`, `design/ux/`, `engineering/`, `security/`, `ai/`, `development/`.
- Read the relevant docs BEFORE changing code — they encode decisions made in volumes 1–6.
- Code conventions: `docs/development/CODING_STANDARDS.md`. Branching: `docs/development/BRANCHING_STRATEGY.md`.

## Commands (Windows / PowerShell)
- `npm run dev` — Next dev on :3000 (ONE instance only; concurrent dev corrupts `.next` types)
- `npm test` — vitest run (currently 234 passing)
- `npm run lint` — eslint (must be 0 errors)
- `npm run build` — Next standalone build (stop dev server first)
- `npm run test:e2e` — Playwright suite
- `npm run db:migrate:prod`, `db:seed`, `db:constraints` — database lifecycle

## Typecheck
`tsc` via the repo `tsconfig.json` is unreliable because `.next` types can be stale/corrupt.
Use a source-only check:
```
tsconfig.check.json  (extends ./tsconfig.json; "include": ["src"], "exclude": [".next","node_modules"])
npx tsc -p tsconfig.check.json
```

## Hard rules
- NEVER commit `.env`, secrets, keys, or `*.log` files.
- Guard-chain order in API routes: auth → verification → org access/permission → rate limit (see `src/lib/rbac.ts`).
- New audit events MUST be added to the whitelist type in `src/lib/audit.ts`.
- AI: LLM failure must never block the product (template fallback). Never fake confidence scores.
- New env vars: document in `.env.example` (name only).
- Audit actions/roles use the seeded IDs in `prisma/seed.ts`, not magic strings.

## Volume Definition of Done (DoD)
1. Code implemented + verified (lint 0, vitest green, typecheck source-only, e2e touched paths).
2. Docs written under the volume folder (e.g. `docs/security/`, `docs/ai/`).
3. `docs/VOLUMES.md` status updated with the commit hash.
4. Commit message format: `vol: <area> — V<n>: <summary>`.
5. Push to origin/main.

## Current status (mid-Aug 2026)
- ✅ V1 Product, V2 Design/UX, V3 Engineering, V5 AI, V6 Security
- ⏳ V4 Development (docs in progress)
- ⏳ V7 DevOps → V8 Testing → V9 Documentation → V10 Business → V11 Operations → V12 Launch
- Tests: vitest 234 ✓ · Playwright baseline ~11 specs · lint 0 ✓