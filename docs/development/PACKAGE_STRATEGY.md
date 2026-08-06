# Volume 4 — Package Strategy & Dependency Policy

## 1. Manager
- **npm** + committed `package-lock.json`. Exact installs via `npm ci` in CI and onboarding.
- Node 22 (`.nvmrc`) — the only runtime surface.

## 2. Approved dependency families
| Family | Status | Notes |
| --- | --- | --- |
| Next.js 16 / React 19 / TS 5 | pinned majors | upgrading = separate volume-level task |
| `@radix-ui/*` + `class-variance-authority` + `clsx` + `tailwind-merge` | required | UI primitive layer (shadcn-style) |
| lucide-react | required | the only icon library |
| `@tanstack/react-query` | required | all client data fetching |
| `@prisma/client` + `prisma` (dev) | required | schema-driven persistence |
| `bullmq` + `ioredis` | required | queues/scheduler (worker runs in-process) |
| `bcryptjs`, `jose`, `next-auth` | required | auth stack |
| `openai` SDK | optional | used by AI module (raw `/chat/completions` path also possible) |
| `puppeteer` | required | scanner engine (bundled Chromium in image) |
| `stripe`, `@sentry/nextjs` | required | billing + error monitoring |
| vitest, @playwright/test, tsx, eslint, typescript | devDeps | never in prod image |

## 3. Rules
- **No new prod dependency without** a PR note: reason, bundle size impact, license (OSI preferred), security posture.
- **Icons** only from lucide; **UI** only via `components/ui` primitives — no ad-hoc CDN libs.
- Keep `devDependencies` out of `dependencies`.
- Lockfile updated via `npm install <pkg>` (and review the diff — no surprise transitive majors).

## 4. Security gates
- `npm audit --audit-level=high` wired into CI (`ci.yml`); fix or document-suspend high findings.
- `npm outdated` review each volume cycle; critical-patch bumps applied promptly.
- Dependabot/Renovate = roadmap item (V7 DevOps) — until then, manual audit cadence.

## 5. Versioning
- App version mirrors release tags `vX.Y.Z` (SemVer; see BRANCHING_STRATEGY).
- `package.json` deps: prefer `^` for minor-compatible; majors pinned explicitly.