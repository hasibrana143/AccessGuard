# Volume 2 — Dark Mode

## Implementation (in production today)

- Library: **next-themes**, `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>` (`src/components/providers.tsx:20`).
- Strategy: `class` attribute on `<html>` → CSS `.dark { … }` block redefines every token in `globals.css`.
  Tailwind dark variant wired via `@custom-variant dark (&:is(.dark *))` → `dark:` utilities.
- **Default is DARK** (monitoring product → screen-first, deflection focused). No OS sync (`enableSystem=false`).
- **Toggle**: `ThemeToggle` in sidebar (bottom) and Settings → toggles `resolvedTheme` light/dark.
  Icon swaps Sun↔Moon; label "Light/Dark Mode". `suppressHydrationWarning` on `<html>` prevents hydration mismatch.
- Persistence: next-themes writes the choice to `localStorage`; applied on next boot.

## Design rules

1. **Token-only theming.** Everything dark-mode-gated lives in `globals.css` `.dark` block.
   Components must use semantic tokens (`bg-card`, `border-border`) — no literal colors.
   Exception: one-off accent surfaces may use `dark:` variants (e.g. amber verify banner).
2. **Contrast**: light/dark value pairs chosen to hold ≥4.5:1 for body text
   (`--foreground` 0.145 vs `--background` 0.99; `0.95` vs `0.12`). Keep new tokens to the same budget.
3. **Severity & charts**: dark sheets lighten hue-primary per family to stay legible; don’t brighten blacks.
4. **Borders/subtle surfaces**: dark uses alpha whites (`rgb(255…/10%)`, `/8%`) instead of gray — maintain.
5. **Elevation**: dark flips to deep-black alpha for depth without pure black edges.

## Implementation checklist for new components
- [ ] Use only semantic tokens (bg/cards/hover/scribing…).
- [ ] Verify in both themes: nav state `bg-sidebar`, hover `hover:bg-sidebar-accent/50`.
- [ ] Icons/badges use `text-coral`, `text-emerald`, severity classes — fine in both.
- [ ] Custom overrides guarded by `dark:`.
- [ ] No `color-scheme` mismatch on form controls (autofill, range) — confirm in dark.
- [ ] A11y: focus ring `ring-ring` visible both themes; reduced-motion pattern applies globally.

## Verified state

Dark is default + fully wired (`ThemeProvider`, `ThemeToggle`, `.dark` token block, custom-variant).
No remaining raw-color components known; amber email banner is the one intentional `dark:` pair.