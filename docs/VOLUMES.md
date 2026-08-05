# Volume Framework — Master Development Board

> **Rule:** The project is built to the volumes, not the volumes to the project.
> Every volume follows: Requirement Analysis → Architecture Decision → Plan → Implementation → Testing → Documentation → Definition of Done.

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
| 3 | Engineering — Technical Design, Database Design, API Spec, Backend/Frontend/Scanner/AI architectures, GitHub + CI/CD Integration | `docs/engineering/*` (9 docs) | ✅ Done (this commit) |
| 4 | Development — Folder Structure, Coding Standards, Git Workflow, Branching Strategy, Environment Setup, Package Strategy, Build System | `docs/development/*` | ⏸ Pending |
| 5 | AI — Remediation, Prompt Library, Model Routing, Confidence Scoring, Validation Engine, AI Cost Optimization | `docs/ai/*` | ⏸ Pending |
| 6 | Security — Auth, RBAC, Audit Logs, Encryption, Secrets, OWASP, GDPR, SOC 2 | `docs/security/*` | 🔄 In progress (audits 1–4 + gaps) |
| 7 | DevOps — Docker, K8s-ready, GitHub Actions, Monitoring, Logging, Backups, DR | `docs/devops/*` | ⏸ Pending |
| 8 | Testing — Unit, Integration, E2E, Accessibility, Load, Security | `docs/qa/*` | ⏸ Verifying (unit/e2e/a11y green; load + security tests missing) |
| 9 | Documentation — API Docs, User Guide, Admin Guide, Dev Guide, Runbooks | `docs/runbooks/*` | ⏸ Pending |
| 10 | Business — Sales, Marketing, SEO, Pricing, Product Hunt, Investor Deck | `docs/business/*` | ⏸ Pending |
| 11 | Operations — Support, Incident Response, SLA, Feature Flags, Analytics, KPI Dashboard | `docs/ops/*` | ⏸ Pending |
| 12 | Launch — Beta Plan, Production Checklist, Rollback, Roadmap, Versioning, Future | `docs/launch/*` | ❌ Pending |

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
