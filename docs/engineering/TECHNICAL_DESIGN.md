# Volume 3 — Technical Design

> Ground truth: derived directly from the working codebase (`package.json`, `src/`, `prisma/`, `.github/`, docker files). No aspirational stubs.

## 1. Product overview

AccessGuard is a website accessibility (WCAG 2.1 AA) compliance SaaS: monitor customer
websites, detect violations, score risk, remediate with AI fixes, push fixes to GitHub as PRs,
and emit compliance reports. Landing → register → verify email → projects → scans → violations
→ remediation → reports; owner/team + roles; billing via Stripe; notifications via Resend.

## 2. Tech stack (verified)

| Concern | Technology | Evidence |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | `package.json` `next ^16.1.1` (installed 16.2.12) |
| UI | React 19 + TypeScript | `react`, `typescript` |
| Styling | Tailwind CSS v4 + shadcn/ui | `@theme inline`, 48 `components/ui` files |
| ORM | Prisma 6.11 | `prisma/schema.prisma`, 13 models |
| Database | PostgreSQL 16 | docker-compose `postgres:16-alpine` |
| Cache/queue | Redis 7 + BullMQ | `src/lib/redis.ts`, `src/lib/queue.ts` |
| Auth | NextAuth v4 (JWT) + bcrypt + otplib MFA | `src/lib/auth.ts`, `src/lib/rbac.ts` |
| Crawler | Puppeteer + axe-core 4.8.4 (CDN inject) | `src/services/scanner/strategies/axe-core.ts` |
| AI | OpenAI-compatible `fetch` to NVIDIA NIM | `meta/llama-3.3-70b-instruct`, `src/app/api/remediate` |
| GitHub | `@octokit/rest` (OAuth app) | `src/lib/github.ts` |
| Payments | Stripe (demo-fallback) | `src/lib/stripe.ts` |
| Email | Resend | `src/lib/email.ts` |
| Tests | Vitest (19 files) + Playwright (11 specs / 44 tests) | vitest.config.ts, playwright.config.ts |
| CI/CD | GitHub Actions (ci.yml, docker.yml → GHCR) | `.github/workflows` |
| Deploy | Docker standalone image (`node:22-alpine` + Chromium) | Dockerfile, docker-entrypoint.sh |

## 3. System context

```mermaid
flowchart TB
    U[Browser / User] -->|auth, queries, mutations| N[Next.js 16 API routes\n66 handlers]
    U -->|remediates / PRs| Grief[Frontend pages via React Query]
    N -->|query| PG[(Postgres 16)]
    N -->|Prisma client| PG
    N -->|BullMQ producer| Redis[(Redis 7]
    W[Scanner worker\nBulletMQ scans concurrency 3] -->|process| → Axe.browser / fetch / dom
    Sched[Scheduler daemon 60s tick] --> Bull
    N -->|OpenAI-compat| AI[NVIDIA NIM llama-3.3-70b]
    SCI[CI pipelines] -->|build+test+lint| repo
    N -->|REST webhooks| Resend + Slack + Stripe
```

### Runtime topology
- Single Next.js container (`.next/standalone) in docker-compose `app service; worker runs
  **in-process** (BullMQ worker started by `src/instrumentation.ts` when `NEXT_RUNTIME==='nodejs'`).
- Separate containers: postgres, redis. No separate worker VM (note in **DevOps/Gap** §3 worker isolation, scaling under load.)

## 4. Logical architecture (request lifecycle)

```mermaid
sequenceDiagram
    Client->>API route: POST /api/scans
    Note over routing<br>queue worker
    alt ctx
    rbac.ts.
    RBAC: requireAuth; enforceVerificationOnWrite; enforcePermission
    else
    Next 403/401/VERIFICATION_REQUIRED
    end
    Queue->>BullMQ jobs
    ScanWorker->scanner/index.ts: pick strategy
    scanner->site target.compute
    scanWorker->Persist(prisma): Scan + batchViolation try createMany 10)
    scanWorker->Notifications: Slack webhook critical
    scanWorker-->>RBClient
```

## 5. Key decisions (ADR summary)

- **ADR-01:** App Router everywhere, API routes in `src/app/api` (no `pages/api`) → colocated, typed.
- **ADR-02:** Client-side rendering app (zero `'use server'`), all data via React Query → API.
  Trade-off: simpler; SSR would improve a11y/SEO to tracking, revisit for landing only.
- **ADR-03:** Prisma migrations committed; `db:move deploy` at container boot; `check-constraints.sql` sidecar.
- **ADR-04:** JWT sessions (no DB sessions), role+orgId persisted in token; RBAC library `src/lib/rbac.ts`.
- **ADR-05:** queue-synced scans: 3 retries, monthly page-quota gate (`plan-limits.ts`).
- **ADR-06:** LLM via NIM raw `/chat/completions`; template fallback when no key (never fail scans on AI).
- **ADR-07:** Scanner strategies pluggable (axe-core / fetch-regex / dom-regex) with shared output type.
- **ADR-08:** GitHub via OAuth user tokens (encrypted AES-GCM `src/lib/crypto.ts`); App install webhook (`/api/github/webhook`, HMAC verified) added for install-event sync.
- **ADR-09:** containerized deploy single-image; CI pushes GHCR; no Vercel.

## 6. Scale & capacity (current vs target)
- Active models (tables/rows): 13; migrations 2.
- Scan page quota default 100 (crawlConfig), page cap enforced ≤0. QR workers 3, monthly quota from plan fields.
- Planned per Volume 3 docs: queue-DB, k channels, pagination—primitive calibrations stay in VERIFIED data (seed 1 user, etc.).

## 7. Non-functional
| Aspect | State |
| --- | --- |
| Tenancy | org-scoped (`requireOrgAccess`, `requireProjectAccess`), test `tenant-isolation` vitest |
| Rate limit | `src/lib/rate-limit.ts` (Redis; in-memory fallback); presets: default 100/min, scans 10/min, remediate 20/min |
| Logging | `src/lib/error-logger.ts` + Sentry optional (`SENTRY_DSN`) |
| Observability | `LOG_LEVEL`; `/api/health`; no metrics producer yet |
| Backup | `scripts/db-backup.mjs` (`npm run db:backup`) + optional prune |
| A11y | skip-link, focus rings, reduced-motion, axe-testing-e2e |

## 8. Gap register (honest)
- Real: components; scan strategies; AI gate; Stripe webhook; GitHub PR; CI.
- Gap: no metrics, no analytics SDK, no i18n, no separate tsc job (build covers), no deploy step
  in workflow (image only), fallback e2e in CI runs Chromium, no load tests (k6), no Vercel, no GH App webhooks yet.