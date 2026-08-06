# Volume 4 — Folder Structure

## 1. High-level tree (verified)

```
AccessGuard/
├── src/
│   ├── app/                    ← Next.js 16 App Router (routes = API + pages)
│   │   ├── api/               # ~66 route handlers (REST under /api)
│   │   ├── (dashboard)/       # authenticated app shell (layout + 9 pages)
│   │   ├── auth/…, pricing, page.tsx (landing), invite, share/[token]…
│   ├── components/
│   │   ├── ui/                # 48 shadcn/Radix primitives (Button, Card…)
│   │   ├── dashboard/         # sidebar, header, charts, theme-toggle…
│   │   ├── landing/           # marketing sections
│   │   ├── auth/, onboarding/
│   ├── hooks/                 # useAuth, useApi (react-query), use-toast…
│   ├── lib/                   # server libs: db, auth, rbac, queue, redis,
│   │                          # plan-limits, rate-limit, crypto, email, stripe,
│   │                          # github(+pr), audit, error-logger, cron…
│   ├── ai/                    # V5: prompts.ts, model-router.ts, cost.ts (+__tests__)
│   ├── services/
│   │   └── scanner/           # index.ts + strategies/{axe-core,fetch-analysis,dom-analysis}
│   ├── types/                 # shared TS types
│   ├── data/                  # wcag-rules seed source
│   └── middleware.ts          # session + scheduler-key guard
├── prisma/                    # schema.prisma, migrations/, seed.ts, check-constraints.sql
├── e2e/                       # Playwright specs (11) + auth setup
├── .github/workflows/         # ci.yml, docker.yml
├── scripts/                   # db-backup.mjs
├── docs/                      # volume-based reference (product, design, engineering, security, ai…)
├── next.config.ts             # standalone output, headers, rewrites, Sentry
├── tsconfig.json / eslint.config.mjs / postcss.config.mjs / tailwind.config.ts / vitest.config.ts
├── playwright.config.ts
├── Dockerfile, docker-compose.yml, docker-entrypoint.sh, .dockerignore
├── package.json, package-lock.json, .env.example
└── AGENTS.md, README.md, .nvmrc
```

## 2. Conventions

- **`src/` convention**: all app code under `src/`; configs at root.
- **Route group `(dashboard)`** = authenticated app; top-level = public.
- **server-only** logic lives in `src/lib/*` (never import into `'use client'` components except via API).
- **`src/ai/`** isolated domain module with its own `__tests__`.
- co-located tests: `__tests__` next to code (also under `src/app/api/...` for route tests),
  `e2e/` for Playwright.

## 3. Generated/ignored

- `.next/`, `node_modules/`, `.env` (both local files gitignored), `*.tsbuildinfo`, `dev-server*.log`.
- One running **dev server at a time** — `.next` is not safe under concurrent Next processes.

## 4. Add a new feature (file placement checklist)

1. API route → `src/app/api/<domain>/route.ts` (method handlers, guard chain, rate limit).
2. Page → `src/app/<group>/<page>/page.tsx` or `(dashboard)/<view>/page.tsx`.
3. Shared UI → `src/components/ui/<name>.tsx` (reuse existing; only add new primitive when necessary).
4. Server helper → `src/lib/<helper>.ts` + test in `__tests__`.
5. Domain module (e.g., new AI) → `src/<domain>/` like `src/ai/`.