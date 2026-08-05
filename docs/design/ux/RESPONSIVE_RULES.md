# Volume 2 — Responsive Rules

Tailwind breakpoints (defaults) + behavior matrix used in AccessGuard.

## 1. Breakpoints

| Range | Name | Behavior |
| --- | --- | --- |
| ≥ 640px | `sm` | Padding step-up (`sm:p-6`) |
| ≥ 768px | `md` | Form/table minor adjustments |
| ≥ 1024px | `lg` | Sidebar persists (`hidden lg:block`); mobile drawer switches off |
| ≥ 1280px | `xl` | Max-width containers, wider gaps |

## 2. Nav system
- `< lg`: hamburger (header `onMenuClick`) → **Sheet** left `w-64`; selection closes it
  (`(dashboard)/layout.tsx`).
- `≥ lg`: static sidebar `w-64`, active state `bg-sidebar-accent`.

## 3. Content rhythm
- App content: `p-4 sm:p-6 lg:p-8` (layout.tsx).
- Email-verify banner: stacks label + button on small screens, single-row on `sm+`.
- Footer: flex → stacked on narrow widths.

## 4. Data surfaces
- Tables: full width on `lg+`; on mobile prefer card/stacked rows (violations list rows
  compress; teams table may scroll horizontally — `ScrollArea`/`overflow-x-auto` where needed).
- KPI/card grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`-style flows.
- Dialog/sheet: default sheet width fits small screens (`SheetContent` w-64 mobile nav,
  wider for details).

## 5. Touch & interaction
- Touch targets ≥ 44×44 for primary actions on small screens.
- Hover-only actions get fallback visible buttons on touch (no hover state reliance).
- Drawer/dropdown menus scrollable (`ScrollArea`).
- Focus ring remains visible at all widths.

## 6. Charts
- Line/bar charts responsive via container queries (`chart.tsx` wrapper); keep legends
  wrap-safe on narrow viewports.
- Report page `share/[token]`: single-column below `md`.

## 7. Testing matrix
| Viewport | Must check |
| --- | --- |
| 360–639 | hamburger nav, stacked cards, no horizontal scroll, touch targets |
| 640–767 | 2-col grids, tables readable |
| 768–1023 | tablet nav still drawer (< lg) |
| ≥ 1024 | sidebar visible, 4-col KPIs |
| ≥ 1440 | container max-widths, no stretched hero |

Run: dev server + Playwright suite (80 specs cover flows; add responsive variants per change).