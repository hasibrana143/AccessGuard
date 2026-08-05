# Volume 2 — Wireframes

ASCII wireframes for canonical screens, matching implemented layouts & breakpoints
(`lg` breaks sidebar→ drawer).

## W1 — App shell (desktop lg+)
```
┌──────────────┬──────────────────────────────────────────────┐
│  AccessGuard │ menu ⋮ hamburger)  [ logo]   [bell] (user) │ header
├──────────────┼───────── ─────────────────┬─┬───────────────────────┤
│  Sidebar 16rem│  children (route content)       │
│ ...         │ p-4 sm:p-6 lg:p-8                │
│ nav items    │                                  │
│ [Plans&Billing]                                 │
│ [ThemeToggle]  │                                  │
├──────────────┴──────────────────────────────────────┘ footer
```
Footer below children; `⊤` Lawsuit ready badge. Skip link, email banner (amber) d +
mobile drawer replaces the sidebar.

## W2 · Mobile (<lg): hamburger opens Sheet w-64 left,
overlays content.

## W3 · Dashboard
```
[KPI cards row]  [KPI] [KPI] [KPI]
- violations count, scans, projects, score (Big numbers, chart)
[chart ✓ project volume + trend]

[Recent activity list]                [Live scan mini-table]
```

## W4 · Projects
```
[Filters] [Sort]          [New Project]
┌──────────┬───────┬─────────┬─────────┬────────┐
│ Name     │ URL   │ Status  │ Last scan│ Action │
│ demo     │ acme …│ Active  │ 2h ago   │ [Scan] │
└──────────┴───────┴─────────┴─────────┴────────┘
```
Empty: "No projects yet — Create your first project."

## W5 · Scan detail
```
┌ SCAN inspection ───────────────┐
│ URL  …  #elements  [Passed/n] [Critical/s]   │
│ Program→ Rename → Run details                │
│ Progress bar + spinner                      │
└─────────────────────────────────┘
```
Small detail opens Dialog. Post-scan → list New items under Severity.

## W6 · Violations
```
Filter: [All] [Critical] [Serious] [Moderate] [Minor]
Badge severity + Rule name + Page + Redirect
Rows click → details: suggestion code snippet (mono), links.

## W7 · Reports
```
[Range] [Project] [Generate]
Chart trends (line), summary stats, Remediation code block.
```
Public `/share/<token>` renders read-only same layout.

## W8 · Team
```
[+ Invite]   (owner only)
Avatar Name Email Role Status
[All] Manage roles
```

## W9 · Settings
Tabs: Profile | Appearance (ThemeToggle) | Notifications | Push
(notification settings sheet with typed toggles.)

## W10 · Landing / hero
```
Logo   [How it works] [Pricing] [Sign in] [Get Started]
Hero headline + CTA, badges, Logos, features grid, pricing ($49/$149/$399) 3 tiers
Footer (links, privacy, legal)
```

## W11 · Auth
Block subject-centered card (max-w-sm), logo top; fields; error inline; submit spinner;
footer link (have account → sign in).