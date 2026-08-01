# AccessGuard — WCAG Compliance Platform

Automated accessibility compliance scanning with AI-powered remediation. Prevents ADA lawsuits by catching WCAG 2.1/2.2 AA violations before they cost you.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Database:** PostgreSQL (Neon) via Prisma ORM
- **Auth:** NextAuth v4 (Credentials + GitHub OAuth)
- **Queue:** BullMQ (Redis)
- **Logging:** Pino (structured JSON)
- **Error Tracking:** Sentry
- **UI:** Tailwind CSS 4 + shadcn/ui
- **Monitoring:** OpenAPI v3 docs at `/api/docs`

## Quick Start

```bash
# Install
bun install

# Copy env template
cp .env.example .env
# Edit .env with your credentials (see below)

# Push DB schema
npx prisma db push

# Seed test data
npx prisma db seed

# Dev server
bun run dev
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon/RDS) |
| `NEXTAUTH_SECRET` | Auth JWT secret (min 32 chars) |
| `NEXTAUTH_URL` | App base URL (`http://localhost:3000`) |
| `REDIS_URL` | Redis connection string (optional, graceful fallback) |
| `SENTRY_DSN` | Sentry DSN (optional, no-op when unset) |
| `RESEND_API_KEY` | Transactional email (optional) |
| `GITHUB_CLIENT_ID/CLIENT_SECRET` | GitHub OAuth (optional) |
| `STRIPE_SECRET_KEY` | Payment processing (optional) |
| `ALLOWED_ORIGINS` | CORS allowlist, comma-separated (optional) |

## Scripts

| Script | Purpose |
|---|---|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun start` | Start production server |
| `bun run test` | Run test suite |
| `npx prisma db push` | Push schema changes |
| `npx prisma migrate deploy` | Apply migrations |
| `bun run lint` | ESLint + TypeScript check |

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/        # Authenticated pages
│   └── api/                # API routes (versioned under /api/v1)
├── components/             # Reusable React components
│   └── ui/                # shadcn/ui primitives
├── hooks/                  # Custom React hooks
├── lib/                    # Core services
│   ├── auth.ts             # NextAuth config
│   ├── db.ts               # Prisma client singleton
│   ├── redis.ts            # ioredis client (graceful fallback)
│   ├── rate-limit.ts       # Sliding-window rate limiter (Redis/Map)
│   ├── queue.ts            # BullMQ scan queue + worker
│   ├── api-version.ts      # API versioning utilities
│   ├── openapi.ts          # OpenAPI 3.1 spec
│   ├── feature-flags.ts    # Feature flags (env/Redis)
│   ├── error-logger.ts     # Pino structured logger
│   └── error-tracking.ts   # Unified Sentry + Pino capture
├── middleware.ts            # Route protection
└── proxy.ts                # Security headers + CORS middleware
```

## Enterprise Features

- **Structured Logging** — JSON output, correlation IDs, secret redaction
- **Distributed Rate Limiting** — Redis sliding window with in-memory fallback
- **Background Jobs** — BullMQ queue for async scan processing (3 concurrent)
- **Feature Flags** — Runtime toggleable via API or env vars
- **API Versioning** — All endpoints available at `/api/v1/*`
- **Swagger Docs** — Interactive API docs at `/api/docs`
- **Security Headers** — CSP, HSTS, COOP, CORP, Permissions-Policy
- **CORS** — Strict origin validation with `ALLOWED_ORIGINS`
- **Sentry** — Error tracking with zero overhead when DSN is unset
- **GDPR Ready** — Data export, account deletion, privacy policy, cookie consent
- **ADR Log** — Architecture decisions documented in `docs/adr/`

## API

All endpoints are available under `/api/v1/*` (rewritten to `/api/*`):

- `GET /api/health` — Health check
- `POST /api/auth/login` — Email/password login
- `GET/POST /api/projects` — Project CRUD
- `GET/POST /api/scans` — Create and list scans (async via queue)
- `GET /api/violations` — List violations
- `GET /api/reports` — Compliance reports
- `GET/PATCH /api/settings` — User settings
- `GET /api/flags` — Feature flags (admin)
- `GET /api/legal/privacy` — Privacy policy (markdown)
- `GET /api/legal/tos` — Terms of service (markdown)

Interactive docs: `/api/docs` (Swagger UI)

## License

Proprietary — see LICENSE file.
