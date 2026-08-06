# Volume 4 — Coding Standards

Grounded in `tsconfig.json`, `eslint.config.mjs`, and observed patterns.

## 1. TypeScript
- `strict: true`, `noImplicitAny: false`, `moduleResolution: bundler`, `jsx: react-jsx`.
- Path alias `@/*` → `./src/*` everywhere; no relative `../../` imports.
- Shared shapes live in `src/types`; scanner + AI have local types.
- Prisma models are source of truth for DB types (generate); don't hand-write mirror types.

## 2. ESLint (what is enforced)
- Bases: `eslint-config-next/core-web-vitals` + `next/typescript`.
- **Off** (by design): `no-explicit-any`, `no-unused-vars`, `no-non-null-assertion`,
  `ban-ts-comment`, `react-hooks/exhaustive-deps`, `react/no-unescaped-entities`,
  `@next/next/no-img-element`, `@next/next/no-html-link-for-pages`, react-compiler flags.
- **Keep on**: Next web-vitals rules — don't weaken further without a note here.

Run: `npm run lint` (must be 0 errors before merge).

## 3. React / Next conventions
- Pages in App Router are `'use client'` (app is API-driven); root layout is the only server component.
- Data is fetched via `useApi`/React Query (`queryKeys` in `src/hooks/useApi.ts`).
- Components: function components, named exports; prop typing via interfaces; forwardRef only where shadcn pattern requires.
- No `'use server'` components; server work lives in API handlers.

## 4. Styling & UI
- Tailwind v4 tokens ONLY (never raw hex/oklch literals in components — see DESIGN_TOKENS).
- Dark/light via semantic tokens; `dark:` variants for intentional exceptions only.
- Icons: **lucide-react** only. No second icon library.
- Reuse `src/components/ui/*` primitives — add a new primitive only when none covers the need.

## 5. API & security patterns (non-negotiable)
- Route guard chain: `requireVerifiedEmail(request, { permission: X })` / `requireOrgAccess`
  (see `src/lib/rbac.ts`). Every route reads org scope — never trust client ids.
- Validation on every write; rate limits on auth/AI/destructive actions.
- New audit events must be added to the `AUDIT_ACTIONS` type in `src/lib/audit.ts`.
- Never log secrets/tokens/password; redact; use `logger` from `error-logger`.
- New env vars go to `.env.example` (names only) — never commit `.env`.

## 6. AI module rules (src/ai)
- Keep prompts versioned (`PROMPT_VERSION`) and in `prompts.ts`, parsers tested.
- LLM failures must fall back to templates — AI never blocks the product.
- Cost/usage captured via audit events when real model called.

## 7. Testing requirements
- New `src/lib` logic → vitest in `src/lib/__tests__`; scanner → `services/scanner/__tests__`;
  domain modules → `src/<domain>/__tests__`;
- User flows → Playwright in `e2e/`; keep the suite green (`npm run test:e2e`).
- Target: never decrease vitest single-pass (currently **234**) or Playwright green specs.