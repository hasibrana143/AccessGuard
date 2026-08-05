# Volume 2 — Design System

Foundation: tokens (`globals.css`) + Radix/shadcn-style components in `src/components/ui`.
Language: calm, precise, monitoring-dense. Primary hue **coral** (defense energy), secondary **emerald** (compliant/green).

## 1. Principles
1. **Token-only visuals** — color, radius, shadow, motion come from design tokens; components never own raw color.
2. **Scan-first rhythm** — dense data surfaces (violation lists, scan history) with quiet chrome; actions promoted on demand.
3. **Real states everywhere** — every list/detail has loading, empty, success, failure, partial.
4. **Accessible by default** — skip-link, focus rings, semantic nav, reduced-motion, WCAG-driven severity colors.

## 2. Voice & tone
- Brand voice: defender ("Lawsuit Defense Ready™" badge); direct, evidence-based.
- UI copy: short imperative labels, enumerated severity (Critical / Serious / Moderate / Minor / Passed).

## 3. Iconography
- **lucide-react** icon set throughout (sidebar icons: BarChart3, Globe, AlertTriangle, Activity, FileText, ShieldCheck, Users, Settings, CreditCard; brand shield).
- Line icons `h-4 w-4` in nav; `h-7 w-7` logo mark. Don't pull in extra icon libs.

## 4. Elevation & layering
- `elevation-1` subtle (skip-link, cards). `elevation-2` dropdown/dialog/sheet.
- `elevation-3` full-screen overlays / float CTAs.
- Overlays: Dialog, Sheet (mobile nav), DropdownMenu, Popover — all Radix built.

## 5. Components used in-app (see COMPONENT_LIBRARY.md for full inventory + states)
Buttons/Menus/Dropdowns → Forms (Input/Select/Checkbox/Switch/Radio) → Data (Table, Badge, Avatar)
→ Feedback (Alert, AlertDialog, Toast/Sonner, Skeleton) → Overlays (Dialog, Sheet, Popover, Tooltip)
→ Charts (proprietary `chart.tsx` + `ChartContainer` in dashboard/charts) → Scaffold (Progress, Tabs, Accordion, Separator, Breadcrumb, Pagination).

## 6. Density & spacing
- Spacing scale: Tailwind default. Padding scale per surface: content `p-4 sm:p-6 lg:p-8`; card inner `p-4`/`p-6`; nav item rows `gap-3`.
- Data lists: 40–56px rows; table headers uppercase-muted; KPI-style numerics on dashboard.

## 7. Design decisions (source-derived)
- Dark is default (monitoring-first) — toggle available; light fully supported.
- **Severity color language** reused across list/badge/chart (critical=red, serious=amber, moderate=gold, minor=blue, pass=green).
- Emailed banner (verify) is the only hard-coded `dark:` state — acceptable exception.
- Reports: read-only public page — charts embed, no side chrome.

## 8. Alignment gaps (to resolve while building out V2)
1. **Admin page unpolished** — needs sever-gated layout & tables auditing.
2. **Audit-logs gating** — header bell shows "System" count but API returns admin-scoped — reconcile.
3. **Report trend hydration** — static `useHydrateReportTrends` per round, verify.
4. Naming: `scanComplete` vs `scanCompleted` notification-setting field mismatch (UI vs worker) — removed, done (see settings `notification-settings.ts` typed alerts + PATCH validation).