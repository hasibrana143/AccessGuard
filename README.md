# AccessGuard — AI-Powered Accessibility Compliance Platform

Automated WCAG 2.1/2.2 AA compliance scanning with AI-powered remediation. Prevents ADA lawsuits by catching accessibility violations and automatically generating fixes.

## ✨ Features

- 🔍 **Continuous Scanning** — Playwright + axe-core browser-based WCAG scanning
- 🤖 **AI Remediation** — GPT-4 powered fix suggestions with confidence scores
- 🔄 **GitHub Auto-PR** — Automatically create pull requests with fixes
- 📊 **Compliance Reports** — PDF reports for legal/procurement teams
- 💳 **Stripe Billing** — 4-tier pricing with webhooks
- 🔐 **Enterprise Auth** — JWT, MFA (TOTP), OAuth (Google, GitHub)
- 🌍 **i18n** — English + Hindi (1,266 translated keys)
- 🛡️ **Security Hardened** — OWASP Top 10, rate limiting, audit logging

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5.9 (strict mode) |
| Database | PostgreSQL 16 + Prisma 6 |
| Cache/Queue | Redis + BullMQ |
| Scanner | Playwright + axe-core 4.8.4 |
| AI | OpenAI GPT-4 (with fallback models) |
| Auth | NextAuth v4 (JWT + MFA) |
| Payments | Stripe |
| UI | Tailwind CSS 4 + shadcn/ui |
| Testing | Vitest + Playwright + k6 |
| Monitoring | Sentry |
| Logging | Pino (structured JSON) |

## Quick Start

```bash
# Install dependencies
npm install

# Start database
docker compose up -d postgres redis

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Push DB schema
npm run db:push

# Seed test data
npm run db:seed

# Start dev server
npm run dev
```

### Health Check
```bash
curl http://localhost:3000/api/health
# {"status":"healthy","database":"connected"}
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
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run unit tests (321 tests) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:load:smoke` | Run load tests (k6) |
| `npm run db:push` | Push schema changes |
| `npm run db:seed` | Seed database |
| `npm run db:backup` | Create backup |
| `npm run lint` | ESLint check |
| `npx tsc -p tsconfig.check.json --noEmit` | Type check |

## Architecture

```
src/
├── ai/                     # AI remediation module
│   ├── prompts.ts          # Prompt templates (versioned)
│   ├── model-router.ts     # Multi-model routing with retry
│   ├── cost.ts             # Cost tracking
│   └── __tests__/          # AI tests
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (login, register)
│   ├── (dashboard)/        # Dashboard pages (9 routes)
│   ├── api/                # API routes (78 endpoints)
│   └── public/             # Public pages
├── components/             # React components (79 total)
│   ├── ui/                 # shadcn/ui primitives (47)
│   ├── dashboard/          # Dashboard components (12)
│   └── landing/            # Landing page (10)
├── lib/                    # Core libraries (54 files)
│   ├── auth.ts             # Authentication
│   ├── rbac.ts             # Authorization (14 permissions)
│   ├── audit.ts            # Audit logging (44+ events)
│   ├── rate-limit.ts       # Rate limiting with headers
│   ├── api-response.ts     # Standard API responses
│   ├── request-id.ts       # Request tracking
│   └── ...                 # Other utilities
├── services/               # Business logic
│   └── scanner/            # Accessibility scanner (Playwright + axe-core)
├── hooks/                  # Custom React hooks
├── i18n/                   # Internationalization (en + hi)
└── types/                  # TypeScript types
```

## Features

- **Scanner** — Playwright + axe-core (3x faster than Puppeteer)
- **AI Remediation** — GPT-4 with fallback models, retry logic
- **Rate Limiting** — Headers on ALL responses (X-RateLimit-*)
- **Security Headers** — 9 security headers (XSS, HSTS, COOP, CORP)
- **Audit Logging** — 44+ tracked events
- **Loading States** — Skeleton loaders for all pages
- **Error Recovery** — Error boundaries with retry/go back
- **Request Tracking** — X-Request-ID on all responses
- **API Standardization** — Consistent response format
- **Type Safety** — TypeScript strict mode, 0 errors

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
