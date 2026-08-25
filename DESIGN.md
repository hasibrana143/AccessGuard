# DESIGN.md — Agent Visual Judgment Cheat-Sheet

Distilled one-pager for AI agents doing UI work. **Canonical sources** (read before
deep design work): `docs/design/ux/` — `DESIGN_SYSTEM.md`, `DESIGN_TOKENS.md`,
`COMPONENT_LIBRARY.md`, `RESPONSIVE_RULES.md`, `DARK_MODE.md`. Token source of
truth: `src/app/globals.css` (Tailwind v4 `@theme inline`, OKLCH).

## Identity

Calm, precise, monitoring-dense. Primary **coral** (defense energy), secondary
**emerald** (compliant/green). Dark mode is the DEFAULT (next-themes, class
strategy); light fully supported. Icons: **lucide-react only** — never add another
icon lib.

## Color usage rules

| Token | Use for | Never use for |
| --- | --- | --- |
| `coral` (`text-coral`, `bg-primary`) | Brand actions: primary buttons, active nav, focus ring | Severity, success |
| `emerald` / `success` | Compliant/passed states | Brand CTAs |
| `critical` | Severity — critical (red) | Generic errors (use `destructive`) |
| `serious` | Severity — serious (amber) | Warnings (use `warning`) |
| `moderate` | Severity — moderate (gold) | — |
| `minor` | Severity — minor (blue) | Info (use `info`) |
| `pass` | Scan passed (green) | — |

Severity language is fixed and enumerated everywhere: Critical / Serious /
Moderate / Minor / Passed. Same color per severity in lists, badges, AND charts.

**Hard rule:** never hardcode hex/oklch/hsl in components — semantic tokens only
(`bg-card`, `border-border`). One sanctioned exception pattern: a one-off accent
surface may use an explicit `dark:` pair (existing example: email-verify banner).

## Shape, elevation, spacing

- Radius: buttons/inputs `rounded-md`; cards/overlays `rounded-lg`–`rounded-xl`.
  Root token `--radius: 0.625rem`.
- Elevation: `shadow-elevation-1` cards/skip-link · `-2` dropdown/dialog/sheet ·
  `-3` full overlays/floating CTAs.
- Content padding rhythm: `p-4 sm:p-6 lg:p-8`; card inner `p-4`/`p-6`; nav rows
  `gap-3`. Data list rows 40–56px; table headers uppercase + muted.
- Typography: Geist Sans / Geist Mono (code). Big numeric KPIs on dashboard.
  Tailwind default type scale.

## Responsive

Breakpoints are Tailwind defaults. Sidebar static at `lg+` (`hidden lg:block`);
below `lg` hamburger → left Sheet `w-64`, closes on selection. KPI grids:
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Touch targets ≥44×44; no hover-only
actions on mobile (visible fallback). Tables scroll horizontally or compress to
stacked cards below `lg`.

## Component conventions

shadcn/ui primitives from `src/components/ui/*` only — no ad-hoc div-widgets for
menus/dialogs. Every list/detail surface implements all four states: loading
(Skeleton), empty ("No X yet" + CTA), error (toast via sonner + inline), data.
Destructive actions confirm via AlertDialog. Forms wrap in `form.tsx`
(react-hook-form). Charts go through the Recharts wrapper (`chart.tsx`,
`chart-1..5` tokens).

## Dark mode checklist

- Semantic tokens auto-inherit `.dark` — components need zero dark-specific code.
- Dark borders/subtle surfaces use alpha whites (`rgb(255 255 255 / 10%)`), not grays.
- Verify new UI in BOTH themes; focus ring `ring-ring` visible in both.
- No `color-scheme` mismatches on form controls (autofill/range) in dark.

## Visual QA checklist (run before calling any UI change done)

1. Tokens only — grep the diff for raw hex/hsl/oklch values.
2. Correct color role — brand ≠ severity ≠ semantic (table above).
3. All four states present (loading/empty/error/data).
4. Both themes checked (dark default + light toggle).
5. Contrast ≥4.5:1 body text; severity colors match the enumerated language.
6. Responsive: 360px (no horizontal scroll, touch targets), `lg` (sidebar),
   grid step-ups correct.
7. Reduced motion respected (`prefers-reduced-motion` kills animations globally —
   don't introduce always-on transitions).
8. Icons lucide-only, sizes `h-4 w-4` (nav) unless logo mark.
9. Focus rings visible; skip-link unaffected.
10. Screenshot diff vs main branch if the change is visual (Playwright MCP).
