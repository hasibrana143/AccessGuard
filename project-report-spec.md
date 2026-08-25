# AccessGuard — Complete Project Report Specification

> **Version:** 1.0 · **Date:** August 24, 2026
> **Author:** Buffy (Codebuff)
> **Status:** Spec — pending implementation

---

## 1. Purpose & Audience

### 1.1 Purpose
A single exhaustive Markdown document that serves as the **definitive reference** for the AccessGuard project — a complete snapshot of the system's current state, architecture, capabilities, quality, and roadmap. This is a personal reference document.

### 1.2 Audience
- **Primary:** Self — the project owner as a comprehensive reference record
- **Tertiary (potential reuse):** Future team members, potential investors, or compliance reviewers if needed

### 1.3 Output Format
- Single Markdown file: `project-report.md`
- Approximately **10,000–15,000 words** (20+ pages rendered)
- Table of contents at the top with numbered sections
- Mermaid diagrams embedded throughout for architecture, ERD, flowcharts, and CI/CD pipelines
- Tables for metrics, pricing, API inventory, and data

---

## 2. Document Structure

```
project-report.md
├── Table of Contents (numbered, linked)
├── 1. Executive Summary (~1500 words)
│   ├── Project Overview
│   ├── Key Metrics at a Glance (table)
│   ├── Technology Highlights
│   └── Current Status
├── 2. Project Timeline & History (~1500 words)
│   ├── Volume Framework Overview
│   ├── 12-Volume Evolution (table + timeline diagram)
│   ├── Key Milestones & Commits
│   └── Volume 13: SaaS Hardening (in progress)
├── 3. Architecture & Tech Stack (~2000 words)
│   ├── System Architecture (Mermaid diagram)
│   ├── Tech Stack Table
│   ├── Database Architecture (ERD + Prisma models)
│   ├── API Architecture
│   ├── Frontend Architecture
│   ├── AI Integration Architecture
│   └── Infrastructure & Deployment
├── 4. Feature Inventory (~2000 words)
│   ├── Core Features (per-volume breakdown)
│   ├── Dashboard & UI Features
│   ├── Authentication & Access Control
│   ├── Scanning & Remediation
│   ├── Reporting
│   ├── Integrations (GitHub, Stripe, etc.)
│   └── Enterprise Features (SSO, SCIM, i18n)
├── 5. API Reference (~1000 words)
│   ├── Route Inventory (table: path, method, auth, rate-limit)
│   ├── OpenAPI Status
│   └── API Patterns & Conventions
├── 6. Security & Compliance (~1500 words)
│   ├── Security Architecture (Mermaid)
│   ├── Authentication & Authorization
│   ├── OWASP Top 10 Mapping (table)
│   ├── Threat Model Summary (STRIDE)
│   ├── Encryption & Secrets Management
│   ├── Audit Logging System
│   ├── GDPR Readiness
│   ├── SOC 2 Readiness
│   └── Specific Mitigations (SSRF, CSV injection, prompt injection)
├── 7. Testing & Quality Assurance (~1000 words)
│   ├── Test Pyramid (Mermaid diagram)
│   ├── Vitest Suite (234+ tests)
│   ├── Playwright E2E Suite (~12 specs)
│   ├── Load Testing (k6)
│   ├── Coverage Thresholds (55/50/58/57)
│   └── Accessibility Testing
├── 8. DevOps & Infrastructure (~1000 words)
│   ├── CI/CD Pipelines (Mermaid)
│   ├── Docker Configuration
│   ├── GitHub Actions Workflows
│   ├── Monitoring & Observability
│   ├── Backup & Recovery
│   └── Secrets Management
├── 9. AI Capabilities (~1000 words)
│   ├── AI Remediation Pipeline (Mermaid)
│   ├── Prompt Library & Versioning
│   ├── Model Routing & Fallbacks
│   ├── Confidence Scoring
│   ├── Cost Optimization
│   └── AI Safety & EU AI Act Compliance
├── 10. Business & Market (~800 words)
│   ├── TAM / SAM / SOM
│   ├── Business Model
│   ├── Pricing Tiers (full breakdown table)
│   ├── Target Personas
│   └── Competitive Positioning
├── 11. Internationalization (i18n) (~500 words)
│   ├── Supported Languages (en, hi)
│   ├── Translation Coverage by Page/Section
│   ├── Locale Switcher
│   └── i18n Architecture (next-intl)
├── 12. Development Process & Tooling (~800 words)
│   ├── Git Workflow & Branching Strategy
│   ├── CI/CD Workflows (ci.yml, docker.yml, load.yml, release.yml)
│   ├── Code Standards
│   ├── Developer Environment Setup
│   ├── Package Management
│   └── Build System
├── 13. Database Design (~600 words)
│   ├── Schema Overview (all 13+ Prisma models)
│   ├── Relationships (Mermaid ERD)
│   ├── Migrations History
│   └── Data Constraints
├── 14. Known Gaps & Deferrals (~600 words)
│   ├── Open Deferrals (from AGENTS.md)
│   ├── Technical Debt
│   ├── Missing Features
│   └── Severity/Impact Assessment (table)
├── 15. Roadmap & Future Work (~500 words)
│   ├── Near-Term Items
│   ├── Medium-Term Items
│   ├── Long-Term Vision
│   └── Open Questions
├── Appendix A: Full Metrics Dashboard
├── Appendix B: Package Dependencies (key libraries table)
├── Appendix C: Environment Variables Reference
└── Appendix D: Glossary
```

---

## 3. Content Requirements by Section

### 3.1 Executive Summary
- One-paragraph project description: "AccessGuard is a..."
- Key metrics table:
  - Total API routes: 78
  - Total components: 79
  - Total source lines: ~38,500
  - Test files: 357
  - Vitest passing: 234+
  - Playwright specs: ~12
  - Prisma models: 13+
  - Volumes completed: 12/13
  - Languages supported: 2 (en, hi)
- Brief tech stack summary (Next.js 16, React 19, Prisma 6, PostgreSQL, Redis, Puppeteer, AI via NVIDIA NIM)
- Current project phase: Mid-V13 SaaS Hardening

### 3.2 Project Timeline & History
- Volume framework explanation (how the project is structured into 12 volumes)
- Mermaid timeline diagram showing V1→V12+ completion
- Table with all 13 volumes: name, area, key deliverables, status, commit hash
- Docs-to-code upgrade log summary (the V1→V13 upgrade rows from VOLUMES.md)
- Key milestones: first API route, first test, first volume complete, security hardening, launch readiness

### 3.3 Architecture & Tech Stack
- **System Architecture Diagram (Mermaid):** Client → Next.js API → PostgreSQL, Redis, Puppeteer Scanner, AI (NVIDIA NIM), GitHub API, Stripe, Sentry
- **Tech Stack Table:**

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2 |
| UI | React | 19 |
| Styling | Tailwind CSS | v4 |
| UI Components | Radix UI (shadcn) | 47+ primitives |
| ORM | Prisma | 6.11 |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis + BullMQ | ioredis 5 |
| Auth | NextAuth.js | 4.24 |
| AI | NVIDIA NIM (Llama 3.3 70B) | OpenAI-compat |
| Scanner | Puppeteer + axe-core | 4.8.4 |
| Charts | Recharts | - |
| i18n | next-intl | 4.13 |
| Testing | Vitest + Playwright | - |
| Monitoring | Sentry | 10.66 |
| Payments | Stripe | - |
| PDF | @react-pdf/renderer | 4.5 |

- **Database Architecture:**
  - All 13+ Prisma models listed with brief descriptions
  - Mermaid ERD showing relationships
  - Migration history count
  - `check-constraints.sql` usage

- **API Architecture:**
  - 78 route files, grouped by domain
  - Guard chain diagram: Auth → Verification → Org Access → Permission → Rate Limit
  - OpenAPI status: 68 paths documented

- **Frontend Architecture:**
  - App Router structure
  - Dashboard layout (sidebar → Sheet < lg)
  - Dark/light theme system (next-themes)
  - Component library (47+ shadcn primitives)

- **AI Integration Architecture:**
  - Prompt pipeline: Version → Rules → Template → Parser
  - Model router: Primary → Fallback with 30s timeout
  - Cost accounting per 1M tokens

- **Infrastructure:**
  - Docker standalone deploy
  - GitHub Actions (ci.yml, docker.yml, load.yml, release.yml)
  - Sentry monitoring

### 3.4 Feature Inventory
Organized by volume, listing every significant feature:

- **V1 — Product:** Research, market analysis, PRD, personas, journeys
- **V2 — Design:** App flow, IA, wireframes, design system, dark mode, responsive
- **V3 — Engineering:** Technical design, DB design, API spec, scanner, GitHub integration
- **V4 — Development:** Coding standards, git workflow, environment setup
- **V5 — AI:** Remediation, prompts, model routing, confidence scoring, validation
- **V6 — Security:** Auth, RBAC, audit logs, encryption, OWASP, GDPR, SOC 2
- **V7 — DevOps:** Docker, CI/CD, monitoring, logging, backups, DR
- **V8 — Testing:** Unit, integration, E2E, accessibility, load, security testing
- **V9 — Documentation:** API docs, user guide, admin guide, dev guide, runbooks
- **V10 — Business:** Sales, marketing, SEO, pricing, Product Hunt, investor deck
- **V11 — Operations:** Support, incident response, SLA, feature flags, analytics, KPI dashboard
- **V12 — Launch:** Beta plan, production checklist, rollback, roadmap, versioning

- **V13 — SaaS Hardening (in progress):**
  - Legal: Entity formation, IP assignment, cap table, contracts
  - Enterprise: SSO (SAML 2.0), SCIM 2.0 (RFC 7644), audit export
  - Compliance: SOC 2 Type II, ISO 27001, HIPAA, FedRAMP
  - FinOps: Revenue fraud, burn rate, ASC 606
  - AI Safety: EU AI Act compliance, model cards, per-org token caps
  - i18n: 8 phases, 2 languages (en, hi), 1500+ translated keys
  - Data Residency: GDPR Art. 20 portability, region field, data export API
  - Customer Success: Churn scoring, admin widgets
  - Consent: EU cookie consent persistence
  - Multi-currency: usd/eur/gbp/inr
  - Rate-limiting: Comprehensive guard chain on sensitive endpoints
  - Dunning emails: Stripe webhook integration
  - Scheduled scans: Unified daemon with HTTP paths

### 3.5 API Reference
- Full route inventory table:
  - Path, HTTP Method, Auth Required, Permission, Rate Limit, Description
- Domain groups:
  - /api/auth/* — Registration, login, email verification, OAuth
  - /api/projects/* — CRUD, import, scan trigger
  - /api/scans/* — Scan execution, results
  - /api/violations/* — Violation management
  - /api/reports/* — Report generation, sharing, download (PDF)
  - /api/remediate/* — AI remediation, batch
  - /api/admin/* — SSO, SCIM, health, roles
  - /api/billing/* — Subscription, currency, portal
  - /api/audit-logs/* — Audit log access, export (JSON/CSV/CEF)
  - /api/scim/v2/* — SCIM Users + Groups
  - /api/consent/* — Cookie consent
  - /api/settings/* — Region, preferences
  - /api/github/* — Webhook, status
  - /api/stripe/* — Webhook, subscription
  - /api/health/* — Live, ready probes
  - /api/team/* — Members, invites
  - /api/roles/* — Custom RBAC roles
  - /api/flags/* — Feature flags
  - /api/notifications/* — Notification settings
  - /api/org/* — Data export (GDPR)
  - /api/stats/* — Usage statistics
  - /api/docs/* — OpenAPI spec
- OpenAPI parity: 68 paths documented
- Standard patterns: requireVerifiedEmail, requireOrgAccess, requireProjectAccess, validateBody

### 3.6 Security & Compliance

- **Security Architecture Diagram (Mermaid):**
  - Request → Rate Limit → Auth Check → Email Verification → Org Access → Permission Check → Handler
  - Secrets → AES-GCM encryption at rest
  - JWT session tokens (httpOnly cookies)
  - OAuth state: HMAC-SHA256 with timing-safe compare

- **OWASP Top 10 Mapping Table:**

| OWASP Category | Status | Mitigations |
|----------------|--------|-------------|
| A01: Broken Access Control | ✅ Mitigated | RBAC chain, org-scoping, requireProjectAccess |
| A02: Cryptographic Failures | ✅ Mitigated | AES-GCM, bcryptjs, no plaintext secrets |
| A03: Injection | ✅ Mitigated | Prisma parameterized queries, input validation |
| A04: Insecure Design | ✅ Mitigated | Threat model (STRIDE), security-first architecture |
| A05: Security Misconfiguration | ✅ Mitigated | Security headers (X-Frame-Options, HSTS, nosniff) |
| A06: Vulnerable Components | ⚠️ Monitored | Dependabot config, Trivy scans |
| A07: Auth Failures | ✅ Mitigated | MFA gate, rate limits, bcrypt, OAuth state |
| A08: Data Integrity Failures | ✅ Mitigated | Webhook idempotency (WebhookEvent), P2002 dedupe |
| A09: Logging Failures | ✅ Mitigated | Comprehensive audit log with whitelisted actions |
| A10: SSRF | ✅ Mitigated | Input validation, URL validation, fail-closed |

- **Threat Model Summary (STRIDE):**
  - 3 critical flows analyzed
  - P0 threats: SSRF, CSV injection, prompt injection — all verified mitigated in code
  - STRIDE table with mitigations for each category

- **Specific Mitigations:**
  - OAuth state: hardcoded fallback removed, HMAC-SHA256, timing-safe compare
  - Cross-tenant React Query bleed: cache cleared on logout/org change
  - Audit-logs UI parity: admin-only access enforced
  - Rate limiting: comprehensive guard chain on all sensitive endpoints
  - Webhook security: idempotency, stale subscription guard, checkout mode guard
  - Formula injection: sanitized in CSV export
  - Prompt injection: mitigated in AI module

- **Compliance Readiness:**
  - SOC 2 Type II: via Vanta/Drata
  - ISO 27001: ISMS + SoA documented
  - HIPAA: gating criteria documented
  - FedRAMP: phasing plan
  - GDPR: data portability, data residency, cookie consent, right to erasure ready
  - EU AI Act: Limited Risk classification, Art. 50 transparency

### 3.7 Testing & Quality Assurance

- **Test Pyramid (Mermaid):** Unit → Integration → E2E → Load
- **Vitest Suite:**
  - 234+ passing tests
  - Coverage thresholds: Statements 55%, Branches 50%, Functions 58%, Lines 57%
  - Test locations: `src/lib/__tests__`, `src/<domain>/__tests__`, `services/scanner/__tests__`
  - AI tests: 20+ dedicated tests
- **Playwright E2E:**
  - ~12 spec files
  - Project setup for auth
  - Covers: login, dashboard, projects, scans, settings, reports
- **Load Testing (k6):**
  - smoke.js — baseline
  - scan-flow.js — scan pipeline
  - ai-remediate.js — AI remediation
  - soak.js — 1-hour soak test
  - load-test-seed.ts — test data setup
- **Accessibility:** WCAG AA color-contrast guard (13 routes × 2 themes)
- **Security Tests:** Dedicated security test suite

### 3.8 DevOps & Infrastructure

- **CI/CD Pipelines (Mermaid diagram):**
  - ci.yml: Lint, typecheck, vitest, Playwright
  - docker.yml: Build, Trivy scan, SBOM, multi-arch
  - load.yml: k6 load tests with soak option
  - release.yml: Changelog + GitHub Release on v* tags
- **Docker:**
  - Standalone Next.js build
  - Multi-arch support
  - Docker Compose for local dev (Postgres + Redis)
- **Monitoring:** Sentry integration (error tracking)
- **Secrets:** Never committed, .env.example for names, AES-GCM encryption
- **Backups:** db-backup.mjs script, backup/restore commands
- **Status Page:** /status route (live + ready probes)

### 3.9 AI Capabilities

- **Remediation Pipeline (Mermaid):** Violation → Prompt Builder → Model Router → Response Parser → Template Fallback → Code Suggestion
- **Prompt Library:** Versioned (PROMPT_VERSION), WCAG rules, strict marker parser, template renderer
- **Model Routing:** Primary (NVIDIA NIM Llama 3.3 70B) → Fallback, 30s timeout
- **Confidence Scoring:** Null for scanner-derived, real only from LLM, no fake scores
- **Cost Optimization:** Per-1M pricing table, estimateCost function, per-org audit events
- **AI Safety:** EU AI Act compliance (Limited Risk), model cards, per-org token caps, prompt injection defense

### 3.10 Business & Market

- **Pricing Tiers (full breakdown):**
  - Starter / Professional / Enterprise tiers
  - Feature matrix per tier
  - Scan limits, team member limits, API access
  - Multi-currency support (USD, EUR, GBP, INR)
  - Stripe integration details
- **TAM / SAM / SOM:** From docs/business/
- **Target Personas:** From docs/product/
- **Competitive Positioning:** From docs/business/

### 3.11 Internationalization (i18n)

- **Supported Languages:** English (en), Hindi (hi)
- **Translation Architecture:** next-intl 4.13, cookie → Accept-Language → en resolution
- **Locale Switcher Component:** `src/components/LocaleSwitcher.tsx`
- **Coverage by Phase:**

| Phase | Pages/Features | Keys |
|-------|---------------|------|
| Phase 1 | Login page, root layout | ~50 |
| Phase 2 | Register, sidebar, forgot-password, reset-password, dashboard | ~100 |
| Phase 3 | Projects, violations, reports, scans pages | ~80 |
| Phase 4 | Settings (~150 keys), team, audit logs (35 action labels), admin | ~250 |
| Phase 5 | Dashboard header + 9 widgets (~90 keys) | ~90 |
| Phase 6 | Landing page (~150 keys: hero, features, pricing, FAQ, footer) | ~150 |
| Phase 7 | Public pages: pricing, verify-email, invite, share, status | ~80 |
| Phase 8 | Root metadata, dashboard layout, onboarding wizard | ~60 |

- **Total:** ~860+ translated keys across both languages
- **Gap:** Some newer V13 features may have partial i18n coverage

### 3.12 Development Process & Tooling

- **Git Workflow:** Conventional commits, volume-scoped messages (`vol: <area> — V<n>: <summary>`)
- **Branching Strategy:** From docs/development/BRANCHING_STRATEGY.md
- **CI/CD:** 4 GitHub Actions workflows
- **Code Standards:** From docs/development/CODING_STANDARDS.md
- **TypeScript:** strict mode, @/* path aliases, Prisma as source of truth
- **Linting:** ESLint with next/core-web-vitals + next/typescript
- **Formatting:** Enforced via eslint (no prettier detected)
- **Developer Environment:** Docker (Postgres + Redis), npm scripts, .env configuration
- **Build System:** Next.js standalone build with static asset copy

### 3.13 Database Design

- **Prisma Models (13+):**
  1. Organization — Multi-tenant root entity
  2. User — Auth, roles, GitHub integration
  3. Project — Scannable project entities
  4. Scan — Scan execution records
  5. Violation — Accessibility violations found
  6. Remediation — AI-generated fix suggestions
  7. Report — Generated accessibility reports
  8. AuditLog — Comprehensive audit trail
  9. CustomRole — Custom RBAC roles
  10. TeamInvite — Pending team invitations
  11. GithubConnection — GitHub integration links
  12. WebhookEvent — Stripe webhook idempotency
  13. ScimGroup — SCIM 2.0 group management
  14. CookieConsent — EU cookie consent records
  15. NotificationSettings — User notification preferences

- **Relationships:** Multi-tenant (Organization → everything), hierarchical RBAC
- **Constraints:** check-constraints.sql, unique constraints, foreign keys
- **Migrations:** Prisma migrations + db push (dev)

### 3.14 Known Gaps & Deferrals

| Gap | Area | Severity | Impact |
|-----|------|----------|--------|
| No semantic-release | DevOps | Low | Manual versioning |
| No deploy/preview jobs | DevOps | Medium | No automatic previews on PRs |
| No PostHog analytics | Analytics | Medium | No user behavior tracking |
| No PagerDuty integration | Ops | Medium | No automated incident alerting |
| No status page service | Ops | Low | Self-hosted /status route exists |
| Pixel contrast analysis | Accessibility | Low | V11 deferral closed in V13 |
| i18n not 100% complete | i18n | Low | ~80% coverage, core flows done |
| Soak test needs real infra | Testing | Low | Script exists, needs CI integration |

### 3.15 Roadmap & Future Work

- **Near-Term:**
  - Complete V13 remaining items
  - Deploy/preview jobs for PRs
  - PostHog integration
  - Soak test CI integration

- **Medium-Term:**
  - Semantic-release automation
  - PagerDuty integration
  - Additional language support (i18n expansion)
  - More Playwright specs
  - SOC 2 Type II certification

- **Long-Term:**
  - Kubernetes deployment
  - Multi-region data residency
  - Advanced analytics dashboard
  - Mobile app
  - Marketplace for custom rules

---

## 4. Diagrams Required

All diagrams should be Mermaid format. Minimum required:

1. **System Architecture** — High-level component diagram showing all services
2. **ERD** — Database relationships between all 13+ models
3. **API Guard Chain** — Request flow through auth → verification → org → permission → rate limit
4. **CI/CD Pipeline** — 4 workflows and their triggers
5. **AI Remediation Pipeline** — Prompt → model → parser → fallback flow
6. **Security Request Flow** — Full request lifecycle with security checks
7. **Volume Timeline** — V1→V13 evolution
8. **Test Pyramid** — Unit → Integration → E2E → Load
9. **Deployment Architecture** — Docker standalone, Next.js, Postgres, Redis, Sentry
10. **i18n Flow** — Locale detection → resolution → translation

---

## 5. Tables Required

Minimum tables:

1. Key Metrics Dashboard
2. Tech Stack
3. API Route Inventory (78 routes)
4. OWASP Top 10 Mapping
5. Prisma Models Summary
6. Test Coverage Summary
7. Pricing Tiers Breakdown
8. Volume Status Board (13 volumes)
9. Known Gaps & Deferrals
10. CI/CD Workflow Summary
11. Environment Variables Reference
12. Package Dependencies (key libraries)
13. i18n Translation Coverage
14. Threat Model Summary

---

## 6. Data Sources

All information must be sourced from verified project files, not assumptions:

| Source | What It Provides |
|--------|-----------------|
| `docs/VOLUMES.md` | Volume history, upgrade log, milestones |
| `docs/product/*` | Market analysis, personas, pricing |
| `docs/engineering/*` | Architecture, API spec, database design |
| `docs/security/*` | Auth, RBAC, encryption, OWASP, GDPR |
| `docs/ai/*` | AI capabilities, prompts, model routing |
| `docs/devops/*` | Docker, CI/CD, monitoring |
| `docs/qa/*` | Testing strategy, coverage |
| `docs/business/*` | Business model, marketing, SEO |
| `docs/ops/*` | Operations, incident response |
| `docs/launch/*` | Beta plan, production checklist |
| `docs/legal/*` | Legal, entity, IP, contracts |
| `docs/enterprise/*` | SSO, SCIM, audit export |
| `docs/compliance/*` | SOC 2, ISO 27001, HIPAA |
| `prisma/schema.prisma` | Database schema (source of truth) |
| `package.json` | Dependencies, scripts, versions |
| `src/app/api/**/route.ts` | API route inventory |
| `src/components/**/*.tsx` | Component inventory |
| `src/ai/*` | AI module implementation |
| `src/lib/*` | Core libraries (rbac, audit, stripe, etc.) |
| `.env.example` | Environment variable reference |
| `e2e/` | Playwright test inventory |

---

## 7. Quality Criteria

The report must:

1. **Be accurate** — Every metric, count, and claim must be verifiable against source code
2. **Be exhaustive** — Cover all 15 sections plus appendices
3. **Include diagrams** — At least 10 Mermaid diagrams
4. **Include tables** — At least 14 structured tables
5. **Be honest about gaps** — Section 14 must list all known deferrals and TODOs
6. **Render correctly** — Standard Markdown that renders in GitHub, VS Code, and Typora
7. **Be self-contained** — No external references needed to understand the document
8. **Use consistent formatting** — Headers, tables, and code blocks follow the same style throughout
