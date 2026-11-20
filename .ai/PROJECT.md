# AccessGuard — Project

**What:** Multi-tenant SaaS for automated web accessibility (WCAG 2.1/2.2 AA) scanning, AI remediation, GitHub auto-PR, compliance reporting, Stripe billing, enterprise SSO/SCIM.

**Stack:** Next.js 16.3.4 (App Router, React 19) · TypeScript strict · PostgreSQL 16 + Prisma 6.11 · Redis 7 + BullMQ · NextAuth v4 + TOTP MFA + SAML · Stripe 22 · Playwright + axe-core · OpenRouter/NVIDIA free-tier AI mesh · Tailwind 4 + shadcn/ui · next-intl (en/hi) · Vitest + Playwright + k6 · Docker standalone.

**Source of truth:** `docs/` (115 docs) + `docs/VOLUMES.md` (build board) + `ARCHITECTURE.md` + `DESIGN.md`.
**Audit:** `PROJECT-AUDIT.md` (2026-11-20).
**Rule:** every change belongs to a volume; DoD in `AGENTS.md`.

**Non-negotiables:**
- Guard chain order: rate limit → auth → email verified → org/project/scan/violation access → permission.
- AI failure must never block the product (template fallback); never fake confidence scores.
- New audit events must be added to `src/lib/audit.ts` whitelist.
- Never commit `.env` / secrets / `*.log`.
- One dev server only (`npm run dev`); stop it before `npm run build`.
- Typecheck via `npx tsc -p tsconfig.check.json` (never against `.next`).
- `bun` not installed — use `npm`/`node`.
