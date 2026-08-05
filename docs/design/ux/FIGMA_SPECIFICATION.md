# Volume 2 — Figma Specification

How to run AccessGuard design work in Figma while staying in lockstep with the code.

## 1. File structure (recommended)
```
AccessGuard Design System
├── 00 Foundations (tokens, color, type, elevation)
├── 10 Components (mirror src/components/ui)
├── 20 Patterns (page templates)
├── 30 Screens (routes: W1–W11 in WIREFRAMES.md)
└── 40 Specs (dev handoff notes)
```

## 2. Token parity rules
- **Source of truth = `globals.css`.** Figma variables must be re-keyed from the CSS custom
  properties; update order: CSS → Figma (never the reverse).
- Color variables in Figma: OKLCH ↔ OKLCH matches 1:1; copy value comments into CSS style
  notes (`--primary: oklch(0.55 0.2 25)`).
- Maps: `Background`, `Foreground`, `Card`, `Popover`, `Primary`, `Secondary`, `Muted`,
  `Accent`, `Destructive`, `Border`, `Input`, `Ring`, `Sidebar*`, `Chart-1..5`,
  `Coral/Emerald`, `Critical…Pass`, `Success/Warning/Info`, `Elevation-1..3`, `Radius-SM..XL`.
- Typography: Geist Sans + Geist Mono; set Figma text styles to the loaded font, weight &
  tracking from Tailwind defaults (e.g., `text-sm`, `font-medium`).

## 3. Component conventions
- Name components the same as files (Button, Card, Badge, Table, …) — enables
  auto-layout copy-paste into `COMPONENT_LIBRARY` lookup.
- Use `auto-layout` everywhere; props: variants = shadcn `variant` prop names
  (`default|secondary|outline|ghost|destructive|link`; `default|sm|lg|icon`).
- Icons: lucide (grab from lucide plugin). Charts: use chart tokens + recharts patterns.

## 4. Deliverables per feature (handoff checklist)
- [ ] Tokens updated (CSS + Figma).
- [ ] Wireframe added to 30 Screens.
- [ ] States: loading/empty/error/success for new surfaces.
- [ ] Responsive: mobile (<lg) variant at least (drawer nav).
- [ ] Dark/light both in spec frame.
- [ ] Notes: link to page/route; mention API hooks used.

## 5. Guardrails
- No new component without a corresponding `src/components/ui/<x>.tsx` (or reuse existing).
- No new color without token (or documented exception in DESIGN_SYSTEM.md §8).
- Keep icon set lucide-only; do not invent custom icons in Figma unless approved.
- Keep spacing in 4px multiples.

## 6. Current parity status
Tokens, layout & component inventory already in code (this volume = ground truth).
Figma project itself is optional until a designer joins; files above (md) are the living spec.