# AccessGuard Architecture

**Version:** 2.0  
**Last Updated:** 2026-08-29  
**Status:** Active — Source of Truth for All Architecture Decisions

---

## 1. System Overview

### 1.1 Purpose
AccessGuard is a **multi-tenant SaaS platform** for automated web accessibility scanning, violation management, and compliance reporting (WCAG 2.1 AA, VPAT, Legal Shield).

### 1.2 Core Value Proposition
- **Scan** → Automated browser-based accessibility scanning (Puppeteer + axe-core)
- **Detect** → WCAG 2.1 AA violations with severity classification
- **Remediate** → AI-generated code fixes (LLM + template fallback) with confidence scoring
- **Report** → Compliance reports (PDF, VPAT, Executive Summary) + audit trail

### 1.3 Target Scale
- **Tenants:** 100+ organizations
- **Projects/Org:** 10–500
- **Scans/Day:** 10,000+ pages
- **Violations Stored:** Millions
- **Multi-region:** US + EU (GDPR)

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Web App    │  │  Mobile PWA │  │  Public API │  │  Webhooks   │       │
│  │  (Next.js)  │  │  (Future)   │  │  (REST)     │  │  (GitHub,   │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   Stripe)   │       │
└─────────┼────────────────┼────────────────┼─────────┼────────────┘       │
          │                │                │         │                    │
          ▼                ▼                ▼         ▼                    │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / GATEWAY LAYER                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Next.js Middleware (auth, rate-limit, i18n, feature flags, CORS)  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   BFF LAYER     │       │   API GATEWAY   │       │   WEBHOOK       │
│  (Server Comp.) │       │  (REST Routes)  │       │   HANDLERS      │
│  - Auth         │       │  - CRUD         │       │  - GitHub       │
│  - Data Fetch   │       │  - Search       │       │  - Stripe       │
│  - SSR/ISR      │       │  - Mutations    │       │  - SCIM         │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DOMAIN SERVICES LAYER                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Scanner   │ │  Remediate  │ │  Compliance │ │  Scheduler  │          │
│  │  Service    │ │  Service    │ │  Service    │ │  Service    │          │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘          │
│         │               │               │               │                  │
│         ▼               ▼               ▼               ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     CORE DOMAIN MODELS (Prisma)                     │  │
│  │  Org • User • Project • Scan • Violation • Report • AuditLog        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   DATABASE      │       │    REDIS        │       │   EXTERNAL      │
│  (PostgreSQL)   │       │  (Cache/Queue)  │       │   SERVICES      │
│  - ACID         │       │  - Rate Limit   │       │  - GitHub API   │
│  - Multi-tenant │       │  - Session      │       │  - Stripe       │
│  - Row-level    │       │  - Job Queue    │       │  - Resend       │
│    security     │       │  - Pub/Sub      │       │  - NVIDIA NIM   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 3. Layer Definitions & Responsibilities

### 3.1 Edge / Middleware Layer (`src/middleware.ts`)
**Responsibility:** Cross-cutting concerns at request entry
- Authentication validation (JWT/session)
- Rate limiting (per-IP, per-org, per-endpoint)
- Internationalization (locale detection/redirect)
- Feature flags evaluation
- CORS / security headers
- Request ID correlation

**Invariants:**
- Zero business logic
- Must complete < 10ms
- Stateless (no DB calls — use Redis cache)

### 3.2 BFF Layer (Server Components in `src/app/(dashboard)/*`)
**Responsibility:** Server-side data fetching for UI
- Compose data from multiple domain services
- Apply org-scoped authorization (RBAC)
- Transform domain models → UI view models
- Handle loading/error states

**Invariants:**
- No direct Prisma calls — use Repository layer
- No mutation logic — only queries
- Cache with `next/cache` (revalidate tags)

### 3.3 API Gateway Layer (`src/app/api/*/route.ts`)
**Responsibility:** RESTful HTTP interface
- Request validation (Zod schemas)
- Authentication + authorization (RBAC guards)
- Rate limiting (per-endpoint configs)
- Mutation orchestration (command handlers)
- Standardized responses (`ApiResponse<T>`)

**Invariants:**
- Thin controllers — delegate to domain services
- All mutations go through Unit of Work
- Structured logging + audit trail

### 3.4 Domain Services Layer (`src/lib/*.ts`, `src/services/*`)
**Responsibility:** Pure business logic, framework-agnostic
- **ScannerService** — Orchestrates Puppeteer + axe-core scans
- **RemediationService** — LLM + template fallback for code fixes
- **ComplianceService** — Report generation (PDF/VPAT/Executive)
- **SchedulerService** — Cron jobs, scheduled scans
- **NotificationService** — Email, push, in-app

**Invariants:**
- No HTTP, no Next.js, no React
- Single responsibility per service
- Injectable dependencies (Repository, Queue, ExternalClient)

### 3.5 Repository Layer (`src/lib/repository.ts`, `src/lib/unit-of-work.ts`)
**Responsibility:** Data access abstraction
- Prisma query encapsulation
- Org-scoped queries (enforce tenancy)
- Transaction management (Unit of Work)
- Optimistic locking for concurrent edits

**Invariants:**
- All Prisma calls hidden behind repository
- No raw SQL in domain services
- Soft deletes (`deletedAt`) for audit

### 3.6 Infrastructure Layer (`src/lib/*.ts` — patterns)
**Responsibility:** Cross-cutting technical capabilities
| Pattern | File | Purpose |
|---------|------|---------|
| Circuit Breaker | `circuit-breaker.ts` | External API resilience |
| Retry/Backoff | `retry.ts` | Transient failure handling |
| Rate Limiter | `rate-limiter.ts` | Token bucket / sliding window |
| Cache | `cache.ts` | Multi-level (Redis + in-memory) |
| Event Bus | `event-driven.ts` | Domain events, outbox pattern |
| Saga | `saga.ts` | Distributed transactions |
| Distributed Lock | `distributed-lock.ts` | Critical section coordination |
| Bulkhead | `bulkhead.ts` | Resource isolation |
| Idempotency | `idempotency.ts` | Duplicate request dedup |

---

## 4. Data Architecture

### 4.1 Multi-Tenancy Strategy
**Approach:** **Shared Database, Shared Schema, Row-Level Security via OrgId**
- Every entity has `orgId` (FK → Organization)
- Repository layer enforces `where: { orgId: user.orgId }` on ALL queries
- Prisma middleware adds orgId filter automatically
- No cross-tenant queries possible

### 4.2 Core Entity Relationships

```
Organization (1) ──────< (N) User
Organization (1) ──────< (N) Project
Organization (1) ──────< (N) AuditLog
Organization (1) ──────< (N) CustomRole
Organization (1) ──────< (N) TeamInvite
Organization (1) ──────< (N) GithubConnection
Organization (1) ──────< (N) ScimGroup

Project (1) ──────────< (N) Scan
Project (1) ──────────< (N) Violation
Project (1) ──────────< (N) ComplianceReport
Project (1) ──────────< (N) ScheduledScan

Scan (1) ─────────────< (N) Violation

User (1) ─────────────< (1) CookieConsent
User (N) ─────────────> (1) CustomRole
```

### 4.3 Indexing Strategy
- **Composite indexes** for common query patterns (see `schema.prisma`)
- **Partial indexes** for soft-delete filtering (`deletedAt IS NULL`)
- **Covering indexes** for high-volume list views
- **No** full-text search in PG — use dedicated search if needed

### 4.4 Soft Delete Pattern
- All mutable entities: `deletedAt DateTime?`
- Repository `findMany` adds `deletedAt: null` by default
- Hard delete only via admin job (GDPR compliance)

---

## 5. Authentication & Authorization

### 5.1 Auth Stack
- **NextAuth.js v4** (credentials, GitHub OAuth, Google OAuth)
- **JWT strategy** (stateless, 7-day expiry)
- **bcrypt(12)** for password hashing
- **TOTP MFA** (optional, per-user)

### 5.2 Session Claims (JWT)
```typescript
{
  id: string;           // User ID
  email: string;
  role: string;         // 'owner' | 'admin' | 'member' | custom
  orgId: string;        // Current organization
  orgSlug: string;      // For URL routing
  orgName: string;
  emailVerified: boolean;
}
```

### 5.3 RBAC Model
```
Permission = Resource + Action
  (e.g., 'project:create', 'violation:fix', 'report:generate')

Built-in Roles:
  Owner  → All permissions + org management
  Admin  → All except owner-only (billing, delete org)
  Member → Read + assigned permissions via CustomRole

CustomRole: Org-defined permission subsets
```

### 5.4 Guard Chain (API Routes)
```typescript
// Order is CRITICAL — see src/lib/rbac.ts
auth → emailVerification → orgAccess → permission → rateLimit → handler
```

---

## 6. Async & Event-Driven Architecture

### 6.1 Job Queue (BullMQ + Redis)
| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `scan` | Page crawling + axe-core | 4 workers |
| `remediation` | LLM fix generation | 2 workers |
| `report` | PDF/VPAT generation | 2 workers |
| `email` | Transactional emails | 10 workers |
| `webhook` | GitHub/Stripe callbacks | 5 workers |
| `scheduler` | Cron triggers | 1 worker |

### 6.2 Domain Events (Outbox Pattern)
```typescript
// Published via transactional outbox
interface DomainEvent {
  type: string;           // 'violation.created', 'scan.completed'
  aggregateId: string;    // Violation ID, Scan ID
  orgId: string;          // For routing
  payload: Record<string, unknown>;
  timestamp: DateTime;
}
```
- **Outbox table** → `WebhookEvent` for at-least-once delivery
- **Consumers:** Email, webhook dispatch, analytics, search indexing

### 6.3 SSE / Real-time
- `/api/sse/dashboard` — Live scan progress, violation alerts
- `/api/sse/violations` — New violation notifications
- Connection state via `useDashboardSSE` hook

---

## 7. Scanner Architecture

### 7.1 Scan Pipeline
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   QUEUE     │───▶│  CRAWLER    │───▶│  ANALYZER   │───▶│  PERSIST    │
│  (BullMQ)   │    │ (Puppeteer) │    │  (axe-core) │    │  (Prisma)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
  Priority:           Max pages:         Rules:              Batch insert:
  High (manual)       100/project        WCAG 2.1 AA        Violations +
  Low (scheduled)     Configurable       Best practices     Scan summary
```

### 7.2 Crawler Configuration (per-project)
```json
{
  "maxPages": 100,
  "excludePaths": ["/admin", "/api"],
  "includeSubdomains": false,
  "requestDelay": 500,
  "timeout": 30000,
  "retryCount": 3
}
```

### 7.3 Scanner Resilience
- Circuit breaker on target site failures
- Per-page timeout (30s) + global scan timeout (15min)
- Graceful degradation: partial results on crash
- Screenshot capture on failure (debugging)

---

## 8. AI Remediation Architecture

### 8.1 Two-Tier Fix Generation
```
┌─────────────────────────────────────────────────────────────────┐
│                    generateRemediation()                        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │  LLM Path     │               │  Template     │
      │  (NVIDIA NIM) │               │  Fallback     │
      └───────┬───────┘               └───────┬───────┘
              │                               │
              ▼                               ▼
      ┌───────────────┐               ┌───────────────┐
      │ Chain-of-     │               │ Deterministic │
      │ Thought Prompt│               │ Rule-based    │
      │ v2 (few-shot) │               │ (WCAG_RULES)  │
      └───────┬───────┘               └───────┬───────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
                    ┌───────────────────┐
                    │ Structured Parse  │
                    │ code/explanation/ │
                    │ confidence/approach
                    └───────────────────┘
```

### 8.2 Prompt Engineering (v2)
- **System Prompt:** Role + chain-of-thought + output format
- **User Prompt:** Violation XML + rule requirement + examples
- **Few-shot:** 3 examples per rule from `WCAG_RULES`
- **Structured Output:** `---CODE---` / `---EXPLANATION---` / `---CONFIDENCE---` / `---APPROACH---`

### 8.3 Safety Guarantees
- **Template fallback** — LLM failure never blocks product
- **Confidence scoring** — Honest 0.5 for templates, 0.7–0.9 for LLM
- **No fake confidence** — Never invent scores
- **Human review required** — UI shows confidence + source

---

## 9. Frontend Architecture

### 9.1 Tech Stack
- **Next.js 16** (App Router, Server Components, Server Actions)
- **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (Radix primitives)
- **next-intl** (i18n: EN/HI, route-based)
- **TanStack Query** (client-state, mutations)
- **Zustand** (lightweight global state: theme, onboarding)

### 9.2 Component Hierarchy
```
app/
├── (dashboard)/
│   ├── layout.tsx          # Sidebar, header, skip-link, providers
│   ├── dashboard/page.tsx  # Stats, charts, recent activity
│   ├── projects/           # CRUD + scan management
│   ├── violations/         # List + detail + fix dialog
│   ├── scans/              # History + live progress
│   ├── reports/            # Generation + download
│   ├── settings/           # Profile, billing, team, integrations
│   └── team/               # Invites, roles, SCIM
├── api/                    # REST endpoints (see 3.3)
├── auth/                   # Login, register, MFA, reset
└── onboarding/             # First-run wizard
```

### 9.3 State Management
| Scope | Tool | Examples |
|-------|------|----------|
| Server | TanStack Query | Projects, violations, scans, reports |
| Client (global) | Zustand | Theme, sidebar, onboarding, toasts |
| Client (local) | React useState | Form inputs, dialogs, filters |
| URL | next/navigation | Filters, pagination, sort |

### 9.4 Accessibility (WCAG 2.1 AA)
- **Skip link** → `#main-content` (single instance)
- **Semantic HTML** — `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>`
- **ARIA** — Labels on icon-only buttons, live regions for toasts
- **Focus management** — `:focus-visible`, trap in dialogs
- **Color contrast** — Tested both light/dark themes (CI gate)
- **Reduced motion** — Respects `prefers-reduced-motion`

---

## 10. Internationalization (i18n)

### 10.1 Strategy
- **next-intl** with route-based locales: `/en/...`, `/hi/...`
- **Namespaces** per page: `dashboard`, `violations`, `vdetail`, `pdetail`, `sdetail`, `rdetail`, `common`, `nav`, `auth`, `reports`, `scans`, `settings`
- **Hindi:** Natural Devanagari UI; technical terms (WCAG, URL, PDF, PR, AI) kept as-is

### 10.2 Message Structure
```
messages/
├── en.json   # 1,200+ keys
└── hi.json   # 1,200+ keys (mirror structure)
```

---

## 11. Observability

### 11.1 Logging (Pino)
- **Structured JSON** — correlation IDs, request IDs
- **Redaction** — Auth headers, cookies, passwords, tokens, API keys
- **Levels:** `debug` (dev), `info` (prod), `warn`/`error` (always)
- **Serialization:** Error objects with stack traces

### 11.2 Metrics (Prometheus-compatible)
| Metric | Type | Labels |
|--------|------|--------|
| `http_requests_total` | Counter | method, route, status |
| `http_request_duration_ms` | Histogram | method, route |
| `scan_duration_ms` | Histogram | project_id, status |
| `violations_detected` | Counter | org_id, severity, rule_id |
| `remediation_generated` | Counter | org_id, source (llm/template) |
| `queue_depth` | Gauge | queue_name |
| `db_query_duration_ms` | Histogram | model, operation |

### 11.3 Health Checks
- `/api/health/live` — Liveness (process up)
- `/api/health/ready` — Readiness (DB + Redis + external APIs)

### 11.4 Distributed Tracing
- **Sentry** (error tracking + performance)
- **Correlation IDs** propagated via headers + AsyncLocalStorage

---

## 12. Security Architecture

### 12.1 Defense in Depth
| Layer | Controls |
|-------|----------|
| Network | Vercel Edge + WAF (rate limit, bot detection) |
| Transport | TLS 1.3, HSTS, secure cookies |
| Application | CSP, X-Frame-Options, Referrer-Policy |
| Input | Zod validation on ALL API routes |
| Auth | NextAuth + JWT + MFA + email verification |
| Authorization | Org-scoped RBAC + permission guards |
| Data | Row-level tenancy, encryption at rest, PII minimization |
| Supply Chain | `npm audit`, Trivy (Docker), SBOM, Dependabot |
| Secrets | GitHub Secrets + Vercel Env (no .env in repo) |

### 12.2 Key Security Patterns
- **CSRF:** Double-submit cookie + header validation
- **Rate Limiting:** Per-IP (anonymous), per-user (authed), per-org (admin)
- **Audit Log:** Immutable, append-only, whitelisted actions
- **Webhook Security:** Signature verification (GitHub, Stripe, SCIM)
- **AI Boundary:** Template fallback, no user input in prompts, confidence disclosure

---

## 13. Deployment & Operations

### 13.1 Environments
| Env | Purpose | DB | Redis | Domain |
|-----|---------|----|-------|--------|
| Local | Development | Docker | Docker | localhost:3000 |
| Preview | PR validation | GitHub Actions | GitHub Actions | vercel.app |
| Staging | Integration test | Neon (branch) | Upstash | staging.accessguard.io |
| Production | Live | Neon (prod) | Upstash | accessguard.io |

### 13.2 CI/CD Pipeline
```
Push/PR → CI (lint, typecheck, test, build, audit, e2e)
           ↓
      Docker Build → GHCR (multi-arch, provenance, SBOM)
           ↓
      Trivy Scan (HIGH/CRITICAL = fail)
           ↓
      Deploy Preview (Vercel) / Production (tag push)
           ↓
      Post-deploy: Canary health check + smoke tests
```

### 13.3 Database Migrations
- **Prisma Migrate** — Versioned, reviewable
- **Prod:** `prisma migrate deploy` (CI gate)
- **Rollback:** `prisma migrate resolve --rolled-back` + down migration
- **Seed:** `npm run db:seed` (idempotent)

---

## 14. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Dashboard TTI | < 2.5s | Lighthouse CI |
| API p95 latency | < 300ms | Sentry / custom |
| Scan throughput | 50 pages/min/worker | Load test (k6) |
| Queue latency | < 10s (p95) | BullMQ metrics |
| DB query p95 | < 50ms | Prisma metrics |
| Bundle size (gz) | < 200KB | next build analyze |

---

## 15. Architectural Decision Records (ADRs)

| ADR | Title | Status |
|-----|-------|--------|
| 001 | Multi-tenancy: Shared DB + Row-Level Security | Accepted |
| 002 | Auth: NextAuth.js v4 + JWT | Accepted |
| 003 | Queue: BullMQ + Redis | Accepted |
| 004 | AI: Template fallback mandatory | Accepted |
| 005 | i18n: next-intl route-based | Accepted |
| 006 | CSS: Tailwind 4 + shadcn/ui | Accepted |
| 007 | State: TanStack Query + Zustand | Accepted |
| 008 | Observability: Pino + Sentry + Prometheus | Accepted |
| 009 | Deployment: Vercel + Docker (GHCR) | Accepted |

---

## 16. Known Technical Debt / Deferrals

| Item | Impact | Mitigation |
|------|--------|------------|
| Puppeteer v24 vulns (extract-zip) | 7 HIGH (test-only) | Upgrade to v25+ (breaking) |
| Semantic-release automation | Manual version bump | GitHub Action + conventional commits |
| Deploy preview jobs | Not configured | Add Vercel preview comments |
| PostHog analytics | Not integrated | Add event tracking |
| PagerDuty on-call | Not configured | Add alert routing |
| Status page | Not deployed | Deploy upstream status |
| i18n: RTL support | Hindi only | Add `dir="rtl"` for Arabic |
| Soak tests | Not scheduled | Add weekly k6 soak |

---

## 17. Extension Points (Future)

### 17.1 Plugin Architecture (Scanner)
```typescript
interface ScannerPlugin {
  name: string;
  onPageLoad(page: Page): Promise<void>;
  onViolationFound(violation: Violation): Promise<void>;
}
```
- Custom rules, third-party integrations

### 17.2 Webhook Extensibility
- User-defined webhook endpoints per org
- Event filtering + retry policy

### 17.3 Custom Report Templates
- Handlebars-based PDF templates
- Branding per organization

---

## 18. Glossary

| Term | Definition |
|------|------------|
| **Org** | Organization — the tenant boundary |
| **Project** | A website/domain being scanned |
| **Scan** | One crawl + analysis run |
| **Violation** | A single WCAG failure instance |
| **Remediation** | Code fix + explanation for a violation |
| **BFF** | Backend-for-Frontend (server components) |
| **Outbox** | Transactional event publishing pattern |
| **Saga** | Choreographed distributed transaction |
| **Circuit Breaker** | Fail-fast for external dependencies |

---

## 19. Governance

- **Architecture changes** → ADR in `docs/architecture/adr/`
- **Schema changes** → Prisma migration + `db:constraints`
- **API changes** → OpenAPI spec (`src/lib/openapi.ts`) + versioning
- **Breaking changes** → Major version + migration guide
- **Security fixes** → Immediate patch, no feature freeze

---

*This document is the single source of truth for AccessGuard architecture. All implementation decisions must trace back to here. Update on every architectural change.*