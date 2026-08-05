# Volume 3 — Frontend Architecture

## 1. Framework & structure

- Next.js 16 (App Router), React 19, TypeScript, `src/` convention.
- Root `src/app/layout.tsx` is the only server component; all pages are `'use client'`
  (0 `'use server'`): data is fetched client-side via React Query against API routes.
- Route groups: `(dashboard)` authenticated app + top-level public pages
  (landing `/`, `/pricing`, `/auth/*`, `/verify-email`, `/reset-password`, `/invite`,
  `/share/[token]`).

## 2. App shell (`(dashboard)/layout.tsx`)
- Auth guard: unauthenticated → render null; unvalidated → full-page spinner.
- Nav: desktop Sidebar (`hidden lg:block`, `w-64`) ↔ mobile left Sheet via hamburger.
- Persistent chrome: email-verify (amber) banner, `OnboardingWizard`, `PushNotificationCenter`,
  footer (badge "Lawsuit Defense Ready™").
- Active view from pathname (`viewMap`).

## 3. State & data
- **React Query**: `QueryClient` (`staleTime 60s`, no refetch-on-focus) in `providers.tsx`; hooks
  `useApi.ts` (projects/violations/scans/stats/trends/remediate mutations).
- **Session**: `session-provider.tsx` (next-auth/react) → `useAuth` (user, isAdmin, login, logout).
- **Theme**: next-themes (`attribute=class`, `defaultTheme=dark`); toggle in sidebar & settings.
- Local UI state via React `useState` (dialogs, sheets, forms).

## 4. Components
- `src/components/ui/*` — 48 shadcn/Radix primitives (button…chart, toaster, sonner).
- `src/components/dashboard/*` — sidebar, header, stats-grid, trend-chart (recharts AreaChart),
  severity-pie (PieChart), recent-violations/ -scans, regression-alerts, ai-fix-rate, roles-manager,
  theme-toggle, push-notification-center.
- `src/components/landing/*` — hero, features, pricing, faq (11 files); `onboarding/OnboardingWizard`.

## 5. Styling system
- Tailwind v4 `@theme inline` tokens (oklch) + `.dark` overrides → whole theme neutral.
- Typography: Geist Sans + Geist Mono.
- Charts: recharts (Area/Pie) wrapped in `chart.tsx`.

## 6. Navigation & routing
- `usePathname`+`useRouter` drive sidebar active + pushes; `router.push(`/${view}`)`.
- `share/[token]` public reads report by token (see GitHub/doc).
- Error pages: `error.tsx`, `global-error.tsx`, `not-found.tsx`; client `error-boundary.tsx`.

## 7. A11y (implemented)
- Skip-to-content link, focus skip, `aria-` on Radix/dialog/sheet, `sr-only` headers,
  `prefers-reduced-motion` global kill-switch, axe e2e assertions on 6 pages.

## 8. Perf notes & gaps
- All app pages client-rendered (API-driven) — fine for dashboard; landing could be
  server-rendered for LCP (candidate improvement).
- No code-split beyond Next default; no image optimization config on landing yet.
- no analytics SDK, no i18n framework (single-en).
- Component inventory, tokens, responsive rules: see `docs/design/ux`.