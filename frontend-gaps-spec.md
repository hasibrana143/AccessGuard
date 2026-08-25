# AccessGuard Frontend Gaps — Full Upgrade Spec

**Date:** August 25, 2026  
**Author:** Buffy (AI Agent)  
**Status:** Spec Complete — Ready for Implementation

---

## Executive Summary

Deep scan revealed **15+ gaps** in the AccessGuard frontend. This spec covers a complete upgrade to bring the frontend to production-quality. All work is organized into **8 phases** with clear dependencies.

**Current State:**
- 100 components, 11 hooks, 34 UI components
- 9 dashboard pages (all 'use client')
- 80 API routes, 323 tests passing
- Basic CRUD working, but missing polish

**Target State:**
- Full UX polish (empty states, animations, keyboard nav)
- Detail pages for all major entities
- Mobile-responsive dashboard
- Real-time updates via SSE
- Command palette for power users
- Full dark mode support

---

## Phase 1: Missing Infrastructure (Quick Wins)

### 1.1 Dashboard Loading State
**Gap:** `/dashboard` is the only dashboard sub-route missing `loading.tsx`
**Fix:** Create `src/app/(dashboard)/dashboard/loading.tsx` with skeleton matching dashboard layout

### 1.2 Empty State Components
**Gap:** No empty states when lists are empty (projects, violations, scans, etc.)
**Fix:** Create reusable `EmptyState` component with:
- Illustrated icon/mascot per context
- Descriptive text
- CTA button (e.g., "Create Project", "Run First Scan")
- Used on: projects, violations, scans, reports, team, audit-logs

**Files to create:**
- `src/components/ui/empty-state.tsx` (reusable)
- Update each page to use it when data.length === 0

### 1.3 Breadcrumbs
**Gap:** No breadcrumbs on any page
**Fix:** Add breadcrumbs to dashboard layout + deep-link pages

**Breadcrumb rules:**
- `/dashboard` → Home
- `/projects` → Projects
- `/projects/[id]` → Projects > Project Name
- `/scans/[id]` → Scans > Scan #123
- `/violations/[id]` → Violations > Missing alt text
- `/reports/[id]` → Reports > Q3 Report
- `/settings` → Settings
- `/team` → Team
- `/admin` → Admin

**Files to create/modify:**
- `src/components/ui/breadcrumb.tsx` (already exists in UI)
- `src/components/dashboard/page-breadcrumbs.tsx` (new)
- Update dashboard layout to include breadcrumbs

### 1.4 Loading Skeletons Per Component
**Gap:** Page-level loading exists but component-level skeletons missing
**Fix:** Add skeleton variants for:
- Project card skeleton
- Violation row skeleton
- Scan result skeleton
- Report card skeleton
- Team member skeleton
- Stats grid skeleton

---

## Phase 2: Detail Pages (Missing Routes)

### 2.1 Project Detail Page
**Route:** `/projects/[id]`
**Content:**
- Project header (name, URL, risk score, status)
- Scan history timeline
- Violation summary (by severity)
- Domain verification status
- Settings (scan frequency, notifications)
- Quick actions (Run Scan, Edit, Delete)

**Files to create:**
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/projects/[id]/loading.tsx`
- `src/app/(dashboard)/projects/[id]/error.tsx`
- `src/app/(dashboard)/projects/[id]/not-found.tsx`
- `src/components/projects/project-detail.tsx`

### 2.2 Scan Detail Page
**Route:** `/scans/[id]`
**Content:**
- Scan header (project, status, duration, timestamp)
- **Full scan report:**
  - Screenshot of scanned page (if captured)
  - Violations list with severity badges
  - AI-generated fix suggestions with code blocks
  - Before/after code diff
  - WCAG criteria references
- Export options (PDF, JSON, CSV)
- Re-scan button

**Files to create:**
- `src/app/(dashboard)/scans/[id]/page.tsx`
- `src/app/(dashboard)/scans/[id]/loading.tsx`
- `src/app/(dashboard)/scans/[id]/error.tsx`
- `src/app/(dashboard)/scans/[id]/not-found.tsx`
- `src/components/scans/scan-detail.tsx`
- `src/components/scans/scan-screenshot.tsx`
- `src/components/scans/fix-suggestion.tsx`

### 2.3 Violation Detail Page
**Route:** `/violations/[id]`
**Content:**
- Violation header (title, severity, status, project)
- Affected element (HTML snippet, selector)
- WCAG criteria reference
- AI-generated fix with explanation
- Code diff (before/after)
- Action buttons (Fix, Ignore, Assign, Create PR)
- History timeline (status changes, assignments)

**Files to create:**
- `src/app/(dashboard)/violations/[id]/page.tsx`
- `src/app/(dashboard)/violations/[id]/loading.tsx`
- `src/app/(dashboard)/violations/[id]/error.tsx`
- `src/app/(dashboard)/violations/[id]/not-found.tsx`
- `src/components/violations/violation-detail.tsx`
- `src/components/violations/code-diff.tsx`

### 2.4 Report Detail Page
**Route:** `/reports/[id]`
**Content:**
- Report header (title, date, project, type)
- Executive summary
- Violation breakdown charts
- Compliance score
- Download/share options
- PDF preview

**Files to create:**
- `src/app/(dashboard)/reports/[id]/page.tsx`
- `src/app/(dashboard)/reports/[id]/loading.tsx`
- `src/app/(dashboard)/reports/[id]/error.tsx`
- `src/app/(dashboard)/reports/[id]/not-found.tsx`
- `src/components/reports/report-detail.tsx`

---

## Phase 3: Keyboard Navigation & Command Palette

### 3.1 Command Palette (Ctrl+K / Cmd+K)
**Feature:** VS Code-type command palette for power users
**Commands to include:**
- Navigate to page (Dashboard, Projects, Scans, etc.)
- Create new project
- Run scan
- Search violations
- Open settings
- Toggle dark mode
- Export data
- Help / keyboard shortcuts

**Files to create:**
- `src/components/command-palette.tsx`
- `src/hooks/useCommandPalette.ts`
- `src/lib/commands.ts` (command registry)

### 3.2 Direct Keyboard Shortcuts
**Shortcuts:**
- `Ctrl+K` / `Cmd+K` — Open command palette
- `Ctrl+N` / `Cmd+N` — New project
- `Ctrl+Shift+S` / `Cmd+Shift+S` — Run scan
- `Ctrl+/` — Show keyboard shortcuts help
- `Escape` — Close modals/dialogs
- `g d` — Go to Dashboard
- `g p` — Go to Projects
- `g s` — Go to Scans
- `g v` — Go to Violations
- `g r` — Go to Reports

**Files to create:**
- `src/hooks/useKeyboardShortcuts.ts`
- `src/components/keyboard-shortcuts-help.tsx`

### 3.3 Focus Management
**Improvements:**
- Focus trap in modals/dialogs
- Skip links for each section
- Focus visible indicators on all interactive elements
- Arrow key navigation in lists

---

## Phase 4: Animations & Micro-interactions

### 4.1 Success Animations
**Triggers:**
- Scan complete → Pulse animation on scan card + toast
- Project created → Card slide-in animation
- Violation fixed → Checkmark animation
- PR created → GitHub icon animation
- Report generated → Download icon pulse
- Settings saved → Green checkmark fade-in

**Files to create:**
- `src/components/ui/success-animation.tsx`
- `src/components/ui/pulse-animation.tsx`

### 4.2 Page Transitions
**Implementation:**
- Framer-motion AnimatePresence for route changes
- Fade-in for new content
- Slide-in for detail pages
- Exit animations for modals

### 4.3 Hover & Click Feedback
- Button hover scale (1.02)
- Card hover elevation change
- Icon spin on refresh
- Progress bar smooth fill
- Number count-up on stats

### 4.4 Loading States
- Skeleton shimmer effect
- Button loading spinner (already partial)
- Progress indicator for long operations
- Optimistic UI updates

---

## Phase 5: Empty States & Onboarding

### 5.1 Empty State Components
Each dashboard page gets a contextual empty state:

| Page | Empty State | CTA |
|------|-------------|-----|
| Projects | Shield illustration + "No projects yet" | "Create Your First Project" |
| Scans | Scan illustration + "No scans yet" | "Run First Scan" |
| Violations | Checkmark illustration + "No violations found" | (Auto-populated after scan) |
| Reports | Document illustration + "No reports generated" | "Generate Report" |
| Team | People illustration + "Invite your team" | "Send Invitations" |
| Audit Logs | Clock illustration + "No activity yet" | (Auto-populated) |
| Admin | Settings illustration + "Configure your workspace" | "Go to Settings" |

### 5.2 New User Onboarding Wizard
**Trigger:** First login after registration
**Steps:**
1. Welcome screen with product overview
2. Add first website (URL input)
3. Connect GitHub (optional)
4. Run first scan
5. Dashboard tour (highlights key features)

**Files to create:**
- `src/components/onboarding/onboarding-wizard.tsx` (exists, needs update)
- `src/components/onboarding/step-components.tsx`
- `src/hooks/useOnboarding.ts`

### 5.3 Setup Checklist
**Trigger:** Returning user with incomplete setup
**Display:** Dashboard top banner with progress
**Items:**
- [ ] Add first project
- [ ] Run first scan
- [ ] Connect GitHub
- [ ] Invite team member
- [ ] Enable notifications
- [ ] Set scan schedule

**Files to create:**
- `src/components/dashboard/setup-checklist.tsx`

---

## Phase 6: Mobile Responsive Dashboard

### 6.1 Responsive Sidebar
**Current:** Fixed sidebar (desktop only)
**Target:** Collapsible sidebar on mobile, bottom nav on small screens

**Changes:**
- Mobile: Bottom navigation bar (Dashboard, Projects, Scans, More)
- Tablet: Collapsible sidebar with icons only
- Desktop: Full sidebar with labels

**Files to modify:**
- `src/app/(dashboard)/layout.tsx`
- `src/components/dashboard/sidebar.tsx`

### 6.2 Responsive Cards
**Current:** Grid layout (lg:grid-cols-3)
**Target:** Stack on mobile, grid on desktop

**Changes:**
- Stats grid: 2 cols on mobile, 4 on desktop
- Project cards: Full width on mobile
- Violation list: Compact cards on mobile

### 6.3 Mobile-Optimized Forms
- Full-width inputs on mobile
- Bottom sheet for modals on mobile
- Swipe gestures for actions

---

## Phase 7: Real-Time Updates (SSE)

### 7.1 Scan Progress Live Updates
**Current:** Manual refresh or 10-sec polling
**Target:** Server-Sent Events for live scan progress

**Implementation:**
- SSE endpoint: `/api/scans/[id]/progress`
- Events: `progress`, `complete`, `error`
- Auto-reconnect on disconnect
- Progress bar with percentage

### 7.2 Dashboard Auto-Refresh
**Target:** Dashboard stats update in real-time
**Implementation:**
- SSE connection on dashboard mount
- Events: `scan_complete`, `violation_found`, `project_added`
- Update relevant cards without full refresh

### 7.3 Violation Live Feed
**Target:** New violations appear in real-time
**Implementation:**
- SSE on violations page
- New violations slide in at top
- Badge count updates

---

## Phase 8: Dark Mode Polish

### 8.1 Current State
- 5 `dark:` references (minimal)
- Theme toggle exists in settings
- CSS variables defined but not fully applied

### 8.2 Target State
- **Every page** properly styled in dark mode
- **Charts** (trend, severity pie) have dark variants
- **Borders** use theme-aware colors
- **Shadows** adjusted for dark backgrounds
- **Images** have dark variants or overlays
- **Print styles** force light mode

### 8.3 Implementation
- Audit all components for `dark:` variants
- Add dark mode to charts (recharts dark theme)
- Test every page in dark mode
- Add `prefers-color-scheme` media query support

---

## Phase 9: Code Quality & Polish

### 9.1 Scans Page Split (255 lines → components)
**Components to extract:**
- `src/components/scans/scan-list.tsx`
- `src/components/scans/scan-card.tsx`
- `src/components/scans/scheduled-scans.tsx`
- `src/components/scans/scan-actions.tsx`

### 9.2 Audit Logs Page Split (211 lines → components)
**Components to extract:**
- `src/components/audit/audit-log-list.tsx`
- `src/components/audit/audit-log-entry.tsx`
- `src/components/audit/audit-filters.tsx`
- `src/components/audit/audit-pagination.tsx`

### 9.3 Reusable Pagination Component
**Current:** Manual pagination in audit-logs
**Target:** Reusable `<Pagination>` component used across all list pages

**Files to create:**
- `src/components/ui/pagination.tsx` (already exists, needs enhancement)

### 9.4 Reusable Search/Filter Component
**Current:** Inline search in violations
**Target:** Reusable `<SearchFilter>` with debounced input, filter chips

**Files to create:**
- `src/components/ui/search-filter.tsx`

---

## Implementation Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| 1. Infrastructure | P0 | Small | None |
| 2. Detail Pages | P0 | Large | Phase 1 |
| 3. Keyboard Nav | P1 | Medium | None |
| 4. Animations | P1 | Medium | None |
| 5. Empty States | P0 | Small | None |
| 6. Mobile | P1 | Large | Phase 2 |
| 7. Real-time | P2 | Large | Phase 2 |
| 8. Dark Mode | P2 | Medium | None |
| 9. Code Quality | P1 | Medium | None |

---

## Estimated File Count

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Detail pages | 16 | 0 |
| Command palette | 3 | 0 |
| Keyboard shortcuts | 2 | 0 |
| Animations | 2 | 0 |
| Empty states | 1 | 9 |
| Onboarding | 2 | 1 |
| Mobile responsive | 0 | 3 |
| Real-time SSE | 0 | 4 |
| Dark mode | 0 | ~30 |
| Code quality | 0 | 4 |
| **Total** | **~26** | **~51** |

---

## Success Criteria

1. ✅ All dashboard pages have empty states
2. ✅ All major entities have detail pages
3. ✅ Command palette works with Ctrl+K
4. ✅ All buttons have loading states
5. ✅ Success animations on all CRUD operations
6. ✅ Mobile responsive on all screen sizes
7. ✅ Dark mode works on all pages
8. ✅ Real-time scan progress via SSE
9. ✅ Keyboard shortcuts work everywhere
10. ✅ Zero console errors
11. ✅ All 323+ tests passing
12. ✅ Typecheck clean (0 errors)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Detail pages break existing links | Add redirects from old modal URLs |
| Command palette conflicts with browser shortcuts | Use Ctrl+K (not Ctrl+Space) |
| SSE connection limits | Auto-reconnect with exponential backoff |
| Dark mode chart rendering | Use recharts dark theme + CSS variables |
| Mobile sidebar UX | Test with real devices, not just resize |
