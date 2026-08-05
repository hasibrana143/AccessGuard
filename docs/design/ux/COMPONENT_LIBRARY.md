# Volume 2 — Component Library

Source: `src/components/ui/*` (shadcn/ui standard — **47 files**), plus app-level components
in `src/components/`.

## 1. UI primitives (inventory: full set, all present)

| Component | File | Purpose |
| --- | --- | --- |
| Button | button | Primary/secondary/ghost/destructive, sizes, full-width |
| Card | card | Surface for sections/KPIs |
| Badge | badge | Severity / status chips |
| Alert / AlertDialog | alert.tsx / alert-dialog.tsx | Inline alerts & destructive confirms |
| Dialog / Sheet / Drawer | dialog / sheet / drawer | Modals, mobile nav, bottom sheets |
| Popover / Tooltip / HoverCard | popover / tooltip / hover-card | An overlay |
| DropdownMenu / Menubar / ContextMenu / NavigationMenu | dropdown-menu, menubar, context-menu, navigation-menu | Menus |
| Tabs / Accordion / Collapsible / Carousel | tabs, accordion, collapsible, carousel | View switching, expand/collapse |
| Table | table | Data grids (violations, scans, team) |
| Input / Textarea / Select / RadioGroup / Checkbox / Switch / Slider / InputOTP / Label | input, textarea, select, radio, checkbox, switch, slider, input-otp, label | forms |
| Form | form.tsx | React-hook-form wrapper for validation |
| Progress / Skeleton / Skeletons | progress, skeleton, skeletons | loading/progress bars |
| Tabs / Calendar | calendar, tabs | date ranges |
| Avatar / AspectRatio / Separator / ScrollArea / Resizable | avatar, aspect-ratio, separator, scroll-area, resizable | layout composables |
| Chart / BarChart | chart.tsx | Recharts wrapper |
| Toaster / Toast / Sonner | toaster, toast, sonner | notifications |

## 2. App-level components (`src/components/`)
- `dashboard/sidebar.tsx` — nav (desktop `w-64` + mobile variant, active state, user footer, Plans & Billing pin).
- `dashboard/header.tsx` — global header, hamburger (mobile), user / logout (`X`).
- `dashboard/theme-toggle.tsx` — dark/light toggler (Sun/Moon).
- `dashboard/push-notification-center.tsx` — permission request integrator.
- `onboarding/OnboardingWizard.tsx` — first-run setup.
- `charts/` — trend charts (KPIs).
- `session-provider.tsx` — auth context wrapper for `useAuth`.
- `http-error` helpers + `useAuth`, `useToast`, `use-project`, `use-query` hooks.

## 3. Component states (must-implement per UI)
- **Loading**: skeletons in lists; spinner inside action buttons; full-page splash on session check.
- **Empty**: "No X yet" states with a CTA.
- **Error**: toast (`sonner`), inline field error, destructive alerts for action failure.
- **Data**: selected nav, active tabs, hover states on rows/hover-actions.

## 4. Chart conventions
- Recharts wrappers in `chart.tsx`; use `chart-1..5` tokens; legends; tooltips with elevation.
- Trend component lives under `dashboard/charts` (used on dashboard/report).

## 5. Content/accessibility caliber
- All Radix components ship proper `aria-*`; labels on avatar/badge; ScrollArea where long.
- Keep icons from lucide only; stay on the above primitives — no ad-hoc div-widgets for menus.