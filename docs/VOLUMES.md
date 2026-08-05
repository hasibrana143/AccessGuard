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

## Volume Status Board

| Vol | Area | Deliverables | Status |
|---|---|---|---|
| 1 | Product — Research, Market, TAM/SAM/SOM, Business Model, Pricing, Personas, Journey, PRD | `docs/product/*` (8 docs) | ✅ Done (commit 39a8a67) |
| 2 | Design / UX — App Flow, IA, Wireframes, Design System, Component Library, Figma Spec, Design Tokens, Dark Mode, Responsive | `docs/design/ux/*` (9 docs, code-ground-truth) | ✅ Done (commit 81de42c) |
| 3 | Engineering Architecture — system design, ERD, partition, scale | `docs/design/enterprise-db-architecture/` | ⏸ Pending volume input |
| 4 | Backend — API spec, auth/RBAC, queue/worker, integrations | `src/app/api`, `src/lib` | ⏸ Verify-only (built) |
| 5 | Frontend — app pages, dashboards, component system | `src/app`, `src/components` | ⏸ Verify-only (built) |
| 6 | Security / Compliance / Performance | Audit rounds 1–4 + remaining HIGH items | 🔄 In progress |
| 7 | Testing / QA | 214 vitest, 80 Playwright, lint, build | ✅ Baseline green |
| 8 | Launch / GTM / Deploy / Observability | Docs, monitoring, Stripe live, Resend | ❌ Pending |

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
