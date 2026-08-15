# Volume Framework — Master Development Board

> **Rule:** The project is built to the volumes, not the volumes to the project.
> Every volume follows: Requirement Analysis → Architecture Decision → Plan → Implementation → Testing → Documentation → Definition of Done.

## Docs → Code Upgrade Log (mid-Aug 2026)

Docs are the spec; after all 12 volumes were written, code was re-audited against them.

| Vol | Upgrade | Commit |
| --- | --- | --- |
| V1 | Share-link expiry (1–365d, default 30) · white-label agency reports · `/api/reports/download` PDF | `5b5484a` |
| V2 | CookieConsent → semantic tokens, 44px touch targets, focus rings | `9c2f2a3` |
| V3 | OpenAPI spec 9 → 68 paths (67-handler inventory + 37 schemas) · `/api/health/live` + `/api/health/ready` probes | `7758cd6` |
| V3 | GitHub App installation webhook (`/api/github/webhook`, HMAC-SHA256) + `User.githubLogin` mapping + audit whitelist | `6862d62` |
| V4 | Governance only — no code change (branching/standards already followed) | — |
| V5 | Audit: conforms (null confidence policy, template fallback, PR gate 0.7) | — |
| V6 | Audit: conforms (JWT, MFA login gate, rate limits, AES-GCM, logger redaction) | — |
| V7 | Dependabot config · Trivy scan + SBOM + multi-arch in docker.yml · coverage gate 40→55/50/58/57 | `c761f06` |
| V8 | `tests/load/*` k6 suite (smoke/scan-flow/ai-remediate) + seed · load.yml workflow · npm load-test scripts | `80b0a54` |
| V8 | Soak test (`tests/load/soak.js`, 1h @ 10 VUs) · `test:load:soak` script · load.yml soak option + 90m timeout | `44d0884` |
| V9 | OpenAPI parity notes (68 paths) · health live/ready probes in RB01 · DEV_GUIDE update | `7e29051` |
| V10 | `sitemap.ts` + `robots.ts` · JSON-LD (SoftwareApplication + FAQPage) · share noindex layout | `7693a69` |
| V11 | Audit: deferrals documented (PostHog, PagerDuty, status page, ticket system) | — |
| V12 | Audit: BETA_PLAN entry criteria code-grounded, all code items done | — |
| V11 | Status page `/status` (probes live + ready, noindex) · dead-code cleanup (`github.ts` hardcoded webhook secret) · ROADMAP/BETA_PLAN/LOAD_TESTING sync | `44d0884` |
| V6 | `/api/github/status` auth bypass fixed (was anonymous + cross-tenant demo lookup → fail-closed, per-caller) · full API auth sweep clean | `9d48080` |
| V7 | Release automation (`release.yml` — changelog + GitHub Release on `v*` tags) · PRODUCTION_CHECKLIST synced to verified state | `cdb8184` |
| V6 | Multi-agent security+SRE audit → subscription GET/POST tenant-scoped, remediate GET authed, prisma CLI closure in runner, docker.yml sha-format/branch-gated scans, load.yml migration | `ff7ba4c` |
| V6/V3/V2 | Full 8-role team wave: billing webhook idempotency (WebhookEvent) + metadata validation, audit-whitelist parity gate, requireProjectAccess+stripe tests, projects N+1 fix, aria-labels, debug e2e exclusion | `4ecf79e` |
| V6 | Webhook review pass: consume events for deleted/missing orgs (no Webhook 500 retry loop), stale-subscription guard, P2002 dedupe race, checkout mode guard, org read inside tx | `75e81c6` |
| V6 | Webhook nits closed: 30d WebhookEvent retention prune (scheduler tick), price-derived plan in subscription.updated, subscription.created/cancelled audit naming sync (whitelist + UI) | `027ecf7` |
| V8/V2 | Pixel-contrast audit (V11 deferral closed): dedicated light+dark WCAG AA color-contrast guard (13 routes x2 themes). Token fixes — dark --coral/--primary 0.65→0.7, --destructive→0.55, 500-shade overrides (red/orange/blue/emerald) both themes, chart-2/3 darkened. Components — bg-coral text-white→text-coral-foreground (onboarding/pricing/invite), reports buttons→700/800, status/settings emerald-600→500 | `3356ef0` |
| V13 | Rate-limit guard chain on sensitive endpoints (violations, team/members, github/oauth, stripe/subscription, stats/usage, audit-logs, projects/import, account/delete, api-key, projects, admin) · `enforceVerificationOnWrite` export · audit-logs route 401-before-429 contract preserved | `ecf3e92` `bf790b9` |
| V13 | Legal volume: ENTITY_FORMATION (Delaware C-Corp, 83(b), insurance), IP_ASSIGNMENT (PIIA, USPTO/Madrid, OSS audit, SBOM), CAP_TABLE (10M shares, 20% pool, 409A, SAFE), CONTRACTS (MSA/ToS/DPA/AUP, Schrems II, SLA tiers) | `70f8e1c` |
| V13 | Enterprise spec: SSO_SCIM_AUDIT_EXPORT (SAML 2.0 WorkOS→passport-saml, SCIM 2.0 RFC 7644, audit webhook export) · THREAT_MODEL (STRIDE, 3 critical flows, P0: SSRF/CSV-injection/prompt-injection — verified already mitigated in code) | `c10913d` |
| V13 | Compliance: CERTIFICATION_PROGRAM (SOC 2 Type II via Vanta/Drata, ISO 27001 ISMS+SoA, HIPAA gate, FedRAMP phasing) · FinOps: REVENUE_FRAUD_BURN (ASC 606, Stripe Radar, velocity checks, 13-wk cash, runway) · AI safety: AI_SAFETY_EU_AI_ACT (Limited Risk, Art. 50 transparency, prompt-injection defense, model cards, per-org token cap) | `89a35ff` |
| V13 | Enterprise code: GET /api/audit-logs/export — SIEM-ready JSON/CSV/CEF export, formula-injection sanitized, guard chain (rate→auth→org→admin→window→10k cap) · OpenAPI parity + 8 contract tests | `db21ff9` |
| V13 | i18n infrastructure: next-intl 4.13 (en + hi), localePrefix never (URLs unchanged, middleware/e2e untouched), cookie→Accept-Language→en resolution, LocaleSwitcher, login page fully translated, root layout async + provider | `3ffa181` `19727bf` |
| V13 | Data residency: Organization.dataRegion + add_org_data_region migration · GET/PATCH /api/settings/region (admin-gated) · GET /api/org/data-export GDPR Art. 20 portability (sensitive fields excluded) · prisma.seed config so reset auto-seeds | `05496c3` `237c656` |
| V13 | Customer success: Organization.churnScore + lastChurnCalcAt · src/lib/churn.ts (S1 +3 no scan 30d, S2 +2 no activity, S3 +4 billing trouble; bands 5 at-risk / 8 high-risk) · weekly cron via scheduler daemon tick with 7d Redis gate · admin API exposes churn/region | `e4d9109` |

## Process (per volume)

1. **Analyze** — volume scope, gaps vs existing build.
2. **Plan** — artifacts/files/models affected; trade-offs stated.
3. **Verify current state** — what already conforms; what must change.
4. **Implement** — code/docs changes (small, reviewable commits).
5. **Verify** — tsc, lint, vitest (214), build, Playwright (80) as applicable.
6. **Document** — update docs/ (product, design, ops).
7. **Definition of Done** — checklist recorded below.

## Volume Status Board (12-volume framework)

| Vol | Area | Deliverables | Status |
|---|---|---|---|
| 1 | Product — Research, Market, TAM/SAM/SOM, Business Model, Pricing, Personas, Journeys, PRD | `docs/product/*` (8 docs) | ✅ Done (commit 39a8a67) |
| 2 | Design / UX — App Flow, IA, Wireframes, Design System, Component Library, Figma Spec, Design Tokens, Dark Mode, Responsive | `docs/design/ux/*` (9 docs) | ✅ Done (commit 81de42c) |
| 3 | Engineering — Technical Design, Database Design, API Spec, Backend/Frontend/Scanner/AI architectures, GitHub + CI/CD Integration | `docs/engineering/*` (9 docs) | ✅ Done (commit 9fea7fb) |
| 4 | Development — Folder Structure, Coding Standards, Git Workflow, Branching Strategy, Environment Setup, Package Strategy, Build System | `docs/development/*` (7 docs) + AGENTS.md + .nvmrc | ✅ Done (commit 68440e9) |
| 5 | AI — Remediation, Prompt Library, Model Routing, Confidence Scoring, Validation Engine, AI Cost Optimization | `docs/ai/*` (7 docs) | ✅ Done (commit 78b03e0) |
| 6 | Security — Auth, RBAC, Audit Logs, Encryption, Secrets, OWASP, GDPR, SOC 2 | `docs/security/*` (8 docs) | ✅ Done (commit 1d140bd) |
| 7 | DevOps — Docker, K8s-ready, GitHub Actions, Monitoring, Logging, Backups, DR, Secrets | `docs/devops/*` (8 docs) | ✅ Done (commit 65590e5) |
| 8 | Testing — Unit, Integration, E2E, Accessibility, Load, Security | `docs/qa/*` (6 docs) | ✅ Done (commit 0de4714) |
| 9 | Documentation — API Docs, User Guide, Admin Guide, Dev Guide, Runbooks | `docs/runbooks/*` (5 docs) | ✅ Done (commit 07c97cc) |
| 10 | Business — Sales, Marketing, SEO, Pricing, Product Hunt, Investor Deck | `docs/business/*` (6 docs) | ✅ Done (commit 689424d) |
| 11 | Operations — Support, Incident Response, SLA, Feature Flags, Analytics, KPI Dashboard | `docs/ops/*` (6 docs) | ✅ Done (commit 979ff05) |
| 12 | Launch — Beta Plan, Production Checklist, Rollback, Roadmap, Versioning, Future | `docs/launch/*` (6 docs) | ✅ Done (commit ff7aaab) |
| 13 | Global SaaS Hardening — Legal, Enterprise (SSO/SCIM/audit export), Compliance, FinOps, AI safety, i18n, data residency, customer success | `docs/legal/*`, `docs/enterprise/*`, `docs/compliance/*`, `docs/finops/*`, `docs/ai/AI_SAFETY_EU_AI_ACT.md` + code (audit export API) | 🚧 In progress (see upgrade log rows V13) |

**Scale anchor (per user directive):** ~80–120 docs, 300–500 diagrams, 100–200 API specs,
100+ tables, 150–300 screens. Every volume docks target numbers to **verified build facts**
(e.g. V3: 13 Prisma tables, ≈66 API handlers, 48 UI components, 44 Playwright cases) —
never paste myths.

## Definition of Done (global)

- [ ] Feature works end-to-end against its use case in PRD §4
- [ ] tsc + lint clean; vitest suite green (214); Playwright green (80)
- [ ] Org-scoped authorization verified (no cross-tenant leaks)
- [ ] Security: input validation, rate limits, secret handling reviewed
- [ ] Docs updated in docs/ (product/design/ops)
- [ ] Single clean commit (message: `vol: <area> — <what>`)
- [ ] Pushed to origin/main

## Volume 2 — Design / UX `done`

Grounded in actual code, not prompts:
- Tokens from `src/app/globals.css` (`:root` / `.dark` OKLCH maps, elevation, radius, Geist fonts).
- Components from `src/components/ui/*` (47 primitives) + app components.
- IA/Flows/Responsive from real route tree + `(dashboard)/layout.tsx` (sidebar→Sheet `<lg`, `p-4 sm:p-6 lg:p-8`).
- Dark mode verified wired: `next-themes` ThemeProvider (`attribute="class"`, default dark), ThemeToggle, `.dark` token block; no next-themes gap.
- Replaced stale AI-prompt stubs: deleted `docs/design/app-flow/APP_FLOW.md` (510-line "ROLE: Principal UX Architect" prompt) and `docs/design/ui-ux-design-system/UI_UX_DESIGN_SYSTEM` prompt.

## Volume 3 — Engineering `done`

Grounded in code (two explore passes over the full repo):
- **Facts verified**: Next.js 16.2 / React 19; Prisma 6.11 + PG16, **13 models**, 2 migrations,
  `check-constraints.sql`; **≈66 API handlers**; RBAC chain (`rbac.ts` 223L, 14 permissions);
  BullMQ worker + 60s scheduler daemon (in-process via instrumentation); scanner = real
  Puppeteer + axe-core 4.8.4 + fetch/dom regex strategies; AI = NVIDIA NIM
  `meta/llama-3.3-70b-instruct` OpenAI-compat with template fallback; GitHub = OAuth user-token
  PR pipeline (encrypted tokens); CI = ci.yml + docker.yml (GHCR); Docker standalone deploy.
- **9 docs** in `docs/engineering/*`; mermaid diagrams (ERD, sequence, flowcharts).
- **Honest gaps recorded**: no k8s/deploy job, no load tests (k6), no analytics/i18n, no
  GH App webhook, canned `aiConfidenceScore 0.92` inconsistency, OpenAPI listing missing.

## Volume 6 — Security `done`

**Code fixes this round (audit HIGH + new):**
1. **OAuth-state hardcoded fallback secret removed** — `oauth-state.ts` now fails closed
   (HMAC-SHA256 signing requires `NEXTAUTH_SECRET`/`OAUTH_STATE_SECRET`); timing-safe compare.
2. **Cross-tenant React Query bleed** — `useAuth` clears the query cache on logout AND
   on org change (query keys weren't org-namespaced; `['projects']` global).
3. **Audit-logs UI parity** — header bell (fetches admin-only `/api/audit-logs`) now
   guarded by `isAdmin`; members no longer see a dead bell/403 link.
4. **Security headers** — `next.config.ts` adds X-Frame-Options DENY, X-Content-Type-Options
   nosniff, Referrer-Policy, Permissions-Policy, Strict-Transport-Security.

**Docs:** `docs/security/*` (8): AUTHENTICATION, RBAC, AUDIT_LOGS, ENCRYPTION,
SECRETS_MANAGEMENT, OWASP (top-10 map + backlog), GDPR_READINESS, SOC2_READINESS.

**Verify:** tsc (source) 0, eslint 0, vitest **214/214**. (Note: `.next/dev` generated types
were corrupt mid-write by the running dev server — source-only typecheck used.)

## Volume 5 — AI `done`

**Code (Vol 5):**
1. **Integrity fix**: scanner's fake `aiConfidenceScore` (0.92 / 0.85–0.99) removed in all
   three strategies (axe-core, fetch, dom) → `null`. Confidence is only ever real (from LLM).
2. **Prompt Library** `src/ai/prompts.ts` — `PROMPT_VERSION`, `WCAG_RULES`, builders,
   strict marker parser, `renderTemplateFix`.
3. **Model Router** `src/ai/model-router.ts` — primary→fallback providers, 30s timeout,
   usage parsing, no-key skip.
4. **Cost accounting** `src/ai/cost.ts` — per-1M pricing table + `estimateCost`;
   `/api/remediate` (+ batch aggregate) writes org-scoped `remediation.ai_cost` audit events.
5. Remediation module rewired (`source`/`model`/`usage`/`costEstimate` returned); template
   fallback on no-key/provider-fail/no-code — AI never blocks.

**Docs:** `docs/ai/*` (7): REMEDIATION, PROMPT_LIBRARY, MODEL_ROUTING, CONFIDENCE_SCORING,
VALIDATION_ENGINE, COST_OPTIMIZATION, EVALS.

**Verify:** tsc 0, eslint 0, vitest **234/234** (+20 AI tests), build pending.
