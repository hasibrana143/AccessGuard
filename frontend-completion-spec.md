# AccessGuard Frontend Completion — Full Polish Spec

**Date:** August 25, 2026
**Author:** Buffy (AI Agent)
**Status:** Spec Complete — Ready for Implementation
**Request:** Complete frontend polish — SSE, dark mode, reports, onboarding, a11y, performance, print

---

## Executive Summary

Frontend is **85% complete** — 108 components, 13 hooks, 3 detail pages, command palette, animations, mobile responsive. This spec covers the remaining **15%** to reach production-quality: real-time updates, dark mode polish, reports detail page, full onboarding wizard, accessibility audit, performance optimization, and print styles.

**Current State:**
- 108 components, 13 hooks, 34 UI components
- 12 dashboard pages + 3 detail pages (all working)
- Command palette (⌘K), keyboard shortcuts, success animations
- Mobile responsive across all pages
- 323 tests passing, typecheck clean

**Target State:**
- Real-time scan progress via SSE
- Full dark mode polish (every page, chart, border)
- Reports detail page with charts
- Full onboarding wizard (5-step guided setup)
- Accessibility audit (focus, ARIA, contrast)
- Performance optimization (images, bundles, lazy loading)
- Print styles for reports

---

## Phase 7: Real-Time Updates (SSE)

### 7.1 Scan Progress Live Updates
**Current:** Manual refresh or 10-sec polling
**Target:** Server-Sent Events for live scan progress

**Implementation:**
- SSE endpoint: `/api/scans/[id]/progress` (exists, needs enhancement)
- Events: `progress`, `complete`, `error`
- Auto-reconnect on disconnect with exponential backoff
- Progress bar with percentage on scan cards
- Toast notification on scan complete

**Files to modify:**
- `src/app/api/scans/progress/route.ts` — Enhance SSE events
- `src/hooks/useScanProgress.ts` — Add auto-reconnect
- `src/components/dashboard/recent-scans.tsx` — Live progress bar
- `src/app/(dashboard)/scans/[id]/page.tsx` — Live status updates

### 7.2 Dashboard Auto-Refresh
**Target:** Dashboard stats update in real-time

**Implementation:**
- SSE connection on dashboard mount
- Events: `scan_complete`, `violation_found`, `project_added`
- Update relevant cards without full refresh
- Connection indicator (green dot = connected)

**Files to modify:**
- `src/app/(dashboard)/dashboard/page.tsx` — SSE listener
- `src/components/dashboard/stats-cards.tsx` — Live stat updates
- `src/components/dashboard/recent-scans.tsx` — Live scan list

### 7.3 Violation Live Feed
**Target:** New violations appear in real-time

**Implementation:**
- SSE on violations page
- New violations slide in at top with animation
- Badge count updates in sidebar
- Sound notification (optional, user preference)

**Files to modify:**
- `src/app/(dashboard)/violations/page.tsx` — SSE listener
- `src/components/violations/violation-row.tsx` — Slide-in animation
- `src/components/dashboard/sidebar.tsx` — Badge count

---

## Phase 8: Dark Mode Polish

### 8.1 Current State
- 5 `dark:` references (minimal)
- Theme toggle exists in sidebar
- CSS variables defined but not fully applied

### 8.2 Target State
- **Every page** properly styled in dark mode
- **Charts** (trend, severity pie) have dark variants
- **Borders** use theme-aware colors
- **Shadows** adjusted for dark backgrounds
- **Images** have dark variants or overlays
- **Print styles** force light mode

### 8.3 Implementation Checklist

| Component | Current | Target |
|-----------|---------|--------|
| Stats cards | ✅ Has dark | Verify contrast |
| Project cards | ⚠️ Partial | Full dark border/shadow |
| Violation rows | ⚠️ Partial | Full dark styling |
| Scan items | ⚠️ Partial | Full dark styling |
| Charts (recharts) | ❌ No dark | Add dark theme |
| Modals/Dialogs | ⚠️ Partial | Full dark background |
| Forms/Inputs | ⚠️ Partial | Full dark styling |
| Tables | ⚠️ Partial | Full dark styling |
| Landing page | ❌ No dark | Full dark hero/sections |
| Pricing page | ❌ No dark | Full dark pricing cards |
| Auth pages | ⚠️ Partial | Full dark styling |

**Files to modify:**
- `src/app/globals.css` — Add missing dark tokens
- All chart components — Add dark theme
- `src/components/landing/*.tsx` — Dark mode styling
- `src/app/pricing/page.tsx` — Dark mode pricing cards
- `src/app/auth/*/page.tsx` — Dark mode auth forms

### 8.4 Chart Dark Theme
```typescript
// recharts dark theme config
const darkTheme = {
  backgroundColor: 'transparent',
  textColor: 'hsl(0 0% 95%)',
  gridColor: 'hsl(0 0% 20%)',
  tooltipBg: 'hsl(0 0% 10%)',
  tooltipBorder: 'hsl(0 0% 20%)',
};
```

---

## Phase 9: Reports Detail Page

### 9.1 Route: `/reports/[id]`
**Content:**
- Report header (title, date, project, type)
- Executive summary with compliance score
- Violation breakdown charts (severity pie, trend line)
- Full violation list with links to detail pages
- Download options (PDF, JSON, CSV)
- Share report (public link generation)
- Print button

**Files to create:**
- `src/app/(dashboard)/reports/[id]/page.tsx`
- `src/app/(dashboard)/reports/[id]/loading.tsx`
- `src/app/(dashboard)/reports/[id]/error.tsx`
- `src/app/(dashboard)/reports/[id]/not-found.tsx`
- `src/components/reports/report-detail.tsx`
- `src/components/reports/report-charts.tsx`
- `src/components/reports/report-actions.tsx`

### 9.2 Report Charts
- Severity breakdown pie chart (critical/serious/moderate/minor)
- Violation trend line chart (over time)
- Compliance score gauge (0-100)
- Fix rate progress bar

### 9.3 Report Actions
- Download as PDF (client-side generation)
- Download as JSON
- Download as CSV
- Share via public link
- Print report
- Regenerate report

---

## Phase 10: Full Onboarding Wizard

### 10.1 Trigger
First login after registration OR returning user with no projects

### 10.2 Steps

| Step | Title | Content | CTA |
|------|-------|---------|-----|
| 1 | Welcome | Product overview, key features | "Get Started" |
| 2 | Add Project | URL input, crawl config | "Add Project" |
| 3 | Connect GitHub | OAuth connection (optional) | "Connect" or "Skip" |
| 4 | Run Scan | Auto-trigger first scan | "Run Scan" |
| 5 | Dashboard Tour | Highlight key features | "Start Using AccessGuard" |

### 10.3 Implementation
- Progress indicator (step dots)
- Back/Next navigation
- Skip option on optional steps
- Save progress (can resume later)
- Dismiss permanently option

**Files to modify:**
- `src/components/onboarding/OnboardingWizard.tsx` — Full rewrite
- `src/components/onboarding/step-welcome.tsx` — Step 1
- `src/components/onboarding/step-add-project.tsx` — Step 2
- `src/components/onboarding/step-connect-github.tsx` — Step 3
- `src/components/onboarding/step-run-scan.tsx` — Step 4
- `src/components/onboarding/step-tour.tsx` — Step 5
- `src/hooks/useOnboarding.ts` — State management

---

## Phase 11: Code Quality Splits

### 11.1 Scans Page Split (261 lines → components)
**Components to extract:**
- `src/components/scans/scan-list.tsx` — Scan list container
- `src/components/scans/scan-card.tsx` — Individual scan card
- `src/components/scans/scheduled-scans.tsx` — Scheduled scans section
- `src/components/scans/scan-actions.tsx` — Retry, external link buttons

### 11.2 Audit Logs Page Split (211 lines → components)
**Components to extract:**
- `src/components/audit/audit-log-list.tsx` — Log list container
- `src/components/audit/audit-log-entry.tsx` — Individual log entry
- `src/components/audit/audit-filters.tsx` — Search, date, action filters
- `src/components/audit/audit-pagination.tsx` — Pagination controls

### 11.3 Reusable Components
- `src/components/ui/pagination.tsx` — Already exists, enhance
- `src/components/ui/search-filter.tsx` — Debounced search with filter chips

---

## Phase 12: Accessibility Audit

### 12.1 Focus Management
- Focus trap in all modals/dialogs
- Focus visible indicators on all interactive elements
- Skip links for each section
- Arrow key navigation in lists

### 12.2 ARIA Labels
- All buttons have `aria-label` or visible text
- All form inputs have associated labels
- All icons have `aria-hidden="true"` (decorative) or `aria-label` (meaningful)
- All interactive elements have proper roles

### 12.3 Color Contrast
- All text passes WCAG AA (4.5:1)
- All interactive elements pass WCAG AA (3:1)
- Error states use more than just color (icon + text)

### 12.4 Screen Reader Support
- Live regions for dynamic content (`aria-live`)
- Proper heading hierarchy (h1 → h2 → h3)
- Meaningful link text (not "click here")
- Form error announcements

**Files to modify:**
- All modal/dialog components — Focus trap
- All form components — ARIA labels
- All icon components — aria-hidden
- `src/app/globals.css` — Focus styles

---

## Phase 13: Performance Optimization

### 13.1 Image Optimization
- Use `next/image` for all images
- Add `priority` for above-the-fold images
- Responsive `sizes` attribute
- WebP/AVIF format preference

### 13.2 Bundle Splitting
- Dynamic imports for heavy components (charts, editors)
- Route-based code splitting (already via Next.js)
- Tree-shaking verification

### 13.3 Lazy Loading
- Lazy load below-fold components
- Intersection Observer for scroll-triggered loads
- Prefetch next likely pages

### 13.4 Caching
- SWR/stale-while-revalidate for data fetching
- Local storage for user preferences
- Service worker for offline support (future)

**Files to modify:**
- `src/components/dashboard/stats-cards.tsx` — Dynamic import charts
- `src/app/(dashboard)/dashboard/page.tsx` — Lazy load sections
- `next.config.ts` — Image optimization config

---

## Phase 14: Print Styles

### 14.1 Print-Friendly Layout
- Hide navigation, sidebar, footer
- Full-width content
- Proper page breaks
- Black text on white background

### 14.2 Print-Specific Content
- Report header with logo and date
- Violation list with full details
- Charts as static images
- Footer with page numbers

**Files to modify:**
- `src/app/globals.css` — Print media query
- `src/app/(dashboard)/reports/[id]/page.tsx` — Print layout
- `src/app/(dashboard)/scans/[id]/page.tsx` — Print layout

### 14.3 Print CSS
```css
@media print {
  body { background: white !important; color: black !important; }
  nav, aside, footer, .no-print { display: none !important; }
  main { padding: 0 !important; }
  .print-break { page-break-after: always; }
}
```

---

## Implementation Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| 11. Code Quality | P1 | Medium | None |
| 8. Dark Mode | P1 | Large | None |
| 7. SSE Real-Time | P1 | Large | None |
| 9. Reports Detail | P1 | Medium | Phase 8 (dark mode) |
| 10. Onboarding | P1 | Medium | None |
| 12. Accessibility | P1 | Medium | None |
| 13. Performance | P2 | Medium | None |
| 14. Print Styles | P2 | Small | Phase 9 (reports) |

**Rationale:**
1. Code quality first (clean code is easier to modify)
2. Dark mode early (visual polish visible immediately)
3. SSE next (biggest UX improvement)
4. Reports detail (needs dark mode for charts)
5. Onboarding (improves new user experience)
6. Accessibility (production requirement)
7. Performance (optimization pass)
8. Print styles (last, depends on reports)

---

## Commit Strategy

| Commit | Phase | Message |
|--------|-------|---------|
| 1 | Phase 11 | `vol: frontend — Phase 11: code quality splits (scans + audit logs)` |
| 2 | Phase 8 | `vol: frontend — Phase 8: full dark mode polish` |
| 3 | Phase 7 | `vol: frontend — Phase 7: SSE real-time updates` |
| 4 | Phase 9 | `vol: frontend — Phase 9: reports detail page` |
| 5 | Phase 10 | `vol: frontend — Phase 10: full onboarding wizard` |
| 6 | Phase 12 | `vol: frontend — Phase 12: accessibility audit` |
| 7 | Phase 13 | `vol: frontend — Phase 13: performance optimization` |
| 8 | Phase 14 | `vol: frontend — Phase 14: print styles` |

---

## Success Criteria

1. ✅ All scans page components split (< 150 lines each)
2. ✅ All audit logs components split (< 150 lines each)
3. ✅ Every page properly styled in dark mode
4. ✅ Charts have dark theme variants
5. ✅ Scan progress updates in real-time via SSE
6. ✅ Dashboard auto-refreshes on new data
7. ✅ Reports detail page with charts and download
8. ✅ Full onboarding wizard (5 steps)
9. ✅ All modals have focus traps
10. ✅ All form inputs have ARIA labels
11. ✅ All images use next/image
12. ✅ Heavy components lazy loaded
13. ✅ Reports print cleanly
14. ✅ 323+ tests still passing
15. ✅ Typecheck clean (0 errors)

---

## Estimated File Count

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| SSE Real-Time | 0 | 6 |
| Dark Mode | 0 | ~25 |
| Reports Detail | 7 | 2 |
| Onboarding | 7 | 1 |
| Code Quality | 6 | 4 |
| Accessibility | 0 | ~15 |
| Performance | 0 | 5 |
| Print Styles | 0 | 3 |
| **Total** | **~20** | **~61** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| SSE connection limits | Auto-reconnect with exponential backoff |
| Dark mode chart rendering | Use recharts dark theme + CSS variables |
| Onboarding wizard complexity | Step-by-step implementation, test each step |
| Print styles breaking layout | Use `@media print` isolation |
| Performance optimization breaking features | Run full test suite after each change |
| Accessibility audit scope creep | Focus on P0 issues first (focus, ARIA, contrast) |
