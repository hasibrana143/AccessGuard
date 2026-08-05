# Volume 2 — Design Tokens

Source of truth: `src/app/globals.css` (Tailwind v4 `@theme inline`). Tokens are CSS
custom properties in OKLCH color space, re-exported as Tailwind color utilities
(`bg-background`, `text-foreground`, `border-border`, `shadow-elevation-2`, …).

## 1. Color roles (light `:root` / dark `.dark`)

| Token | Role | Light (oklch) | Dark (oklch) |
| --- | --- | --- | --- |
| `--background` | App canvas | `0.99 0 0` | `0.12 0 0` |
| `--foreground` | Primary text | `0.145 0 0` | `0.95 0 0` |
| `--card` / `--card-foreground` | Surfaces | `1 0 0` / `0.145` | `0.16` / `0.95` |
| `--popover` / `--popover-foreground` | Floating surfaces | `1` / `0.145` | `0.16` / `0.95` |
| `--primary` / `--primary-foreground` | Brand action (coral) | `0.55 0.2 25` / `0.99` | `0.65 0.2 25` / `0.12` |
| `--secondary` / `--secondary-foreground` | Neutral action | `0.96` / `0.205` | `0.22` / `0.95` |
| `--muted` / `--muted-foreground` | Disabled/tertiary | `0.96` / `0.5` | `0.22` / `0.65` |
| `--accent` / `--accent-foreground` | Highlight (emerald) | `0.65 0.18 160` / `0.15` | `0.7 0.18 160` / `0.12` |
| `--destructive` | Danger (red) | `0.577 0.245 27.325` | `0.65 0.2 25` |
| `--border` / `--input` | Hairlines / fields | `0.9` neutrals | `1 0 0 / 10%`, `1 0 0 / 15%` |
| `--ring` | Focus ring (coral) | `0.55 0.2 25` | `0.65 0.2 25` |

### Brand & severity (custom, "AccessGuard" block)

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `--coral` | Brand primary | `0.55 0.2 25` | `0.65 0.2 25` |
| `--emerald` | Brand secondary/success | `0.65 0.18 160` | `0.7 0.18 160` |
| `--critical` | Severity — critical (red) | `0.55 0.22 25` | `0.6 0.22 25` |
| `--serious` | Severity — serious (amber) | `0.65 0.18 50` | `0.7 0.18 50` |
| `--moderate` | Severity — moderate | `0.75 0.15 85` | `0.8 0.15 85` |
| `--minor` | Severity — minor (blue) | `0.6 0.12 250` | `0.65 0.12 250` |
| `--pass` | Severity — passed (green) | `0.65 0.18 160` | `0.7 0.18 160` |
| `--success` | Semantic success | `0.65 0.18 160`(+fg) | `0.7 0.18 160` |
| `--warning` | Semantic warning | `0.75 0.15 85`(+fg) | `0.8 0.15 85` |
| `--info` | Semantic info | `0.6 0.15 240`(+fg) | `0.65 0.15 240` |

Foreground pairs: coral/emerald/success/info use light-on-dark or dark-on-light to keep ≥4.5:1 contrast.

### Charts
`--chart-1..5`: coral, emerald, amber, blue, violet families — same hue family as brand;
dark variants are lightened to keep contrast on `0.12` background.

## 2. Elevation (shadows)

| Token | Light | Dark |
| --- | --- | --- |
| `--elevation-1` | `0 1px 2px rgb(0 0 0/.05)` + `0 1px 3px rgb(0 0 0/.06)` | 40%/45% alpha versions |
| `--elevation-2` | `2px`/4px` (pan, card draw) | stronger am |
| `--elevation-3` | `0 4px 8px -2px` + `0 12px 24px -4px` (float) | raised | 

Usage: `shadow-elevation-1/2/3` utilities (see skip-link).

## 3. Radius & shape

`--radius: 0.625rem` → utilities `rounded-sm = -4px`, `rounded-md = -2px`,
`rounded-lg` (base), `rounded-xl = +4px`. Component conventions: buttons/inputs `rounded-md`,
cards/overlays `rounded-lg`/`xl`.

## 4. Typography

- Sans: **Geist Sans** (`--font-geist-sans`) loaded in root layout.
- Mono: **Geist Mono** (`--font-geist-mono`) for code/remediation snippets.
- Type scale uses Tailwind default steps (xs…4xl) mapped to numeric/grad classes; large display numerals for KPIs.

## 5. Motion

`tw-animate-css` provides utilities; `prefers-reduced-motion` kills all
animations/transitions globally.

## Token conventions
- **Never** hardcode hex/oklch in components — always reference tokens.
- Semantic prefix use: brand (`coral/emerald`), severity (`critical…pass`), semantic
  (`success/warning/info`), life (`bg/card/popover/border/ring`).
- Dark mode inherits automatically via `.dark` overrides; no component changes needed.