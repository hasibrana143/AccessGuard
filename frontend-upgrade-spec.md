# Frontend Deep Scan & Upgrade — Spec

> **Date:** August 25, 2026
> **Author:** Buffy (Frontend Engineer + Architect)
> **Status:** Ready for implementation
> **Scope:** Full frontend upgrade — page splitting, hooks refactoring, token cleanup, SEO, Turbopack

---

## 1. Executive Summary

Deep frontend scan revealed **7 critical/high issues** and **5 medium issues** that need to be addressed to bring the frontend to production quality. The biggest problems are monolithic page files (settings: 1307 lines, projects: 986 lines, violations: 742 lines), a monolithic hooks file (useApi.ts: 337 lines), hardcoded colors bypassing design tokens, and missing SEO metadata on all dashboard pages.

This spec covers a complete frontend upgrade: splitting large files into focused components, refactoring hooks, fixing design token usage, adding SEO metadata, enabling Turbopack, and fixing all small remaining issues.

---

## 2. Issues Found (Ranked by Severity)

### CRITICAL — Files > 500 lines (must split)

| File | Lines | Issue | Impact |
|------|-------|-------|--------|
| `settings/page.tsx` | 1307 | Single file with 6+ sections (General, Billing, API Key, Notifications, Region, SSO) | Unmaintainable, slow HMR, hard to review |
| `projects/page.tsx` | 986 | Create form + list + edit modal + actions all in one | Same as above |
| `violations/page.tsx` | 742 | Filters + list + bulk actions + detail modal | Same as above |

### HIGH — Files > 300 lines (should split)

| File | Lines | Issue |
|------|-------|-------|
| `useApi.ts` | 337 | Monolithic hooks file (projects, violations, scans, stats, trends, remediation, progress) |
| `team/page.tsx` | 374 | Members list + invite form + pending invites |
| `admin/page.tsx` | 367 | Feature flags + admin data + role management |
| `reports/page.tsx` | 311 | Report list + generate form + share links |
| `roles-manager.tsx` | 304 | Role list + create/edit form + permission matrix |

### MEDIUM

| Issue | Location | Fix |
|-------|----------|-----|
| Hardcoded `gray-500` colors | audit-logs/page.tsx, scans/page.tsx | → design tokens (`text-muted-foreground`, `bg-muted`) |
| Missing `generateMetadata` | 8 dashboard pages | Add `<title>` + `<meta description>` for browser tabs |
| `turbopack: false` | next.config.ts | Enable Turbopack for 10x faster dev HMR |
| Inline `style={{}}` | severity-pie.tsx | Dynamic color needs inline (acceptable) |
| CSS animations limited | globals.css (1 keyframe) | Could add more transitions |

### LOW

| Issue | Notes |
|-------|-------|
| Missing aria-labels on icon buttons | Most buttons already have them |
| CookieConsent onClick without focus management | Low priority, works with keyboard |
| i18n file structure (TS-based) | Different from JSON-based, works fine |

---

## 3. Architecture Plan

### 3.1 Settings Page Split (1307 → ~5 components)

**Current state:** Single file with tabs, forms, billing, API key, notifications, region, SSO sections.

**Target architecture:**

```
src/app/(dashboard)/settings/
├── page.tsx              (~50 lines) — Layout + tab routing
└── loading.tsx           (exists)

src/components/settings/
├── settings-tabs.tsx     (~80 lines) — Tab navigation + routing
├── general-settings.tsx  (~200 lines) — Org name, slug, description
├── billing-settings.tsx  (~250 lines) — Plan, subscription, invoices, currency
├── api-key-settings.tsx  (~100 lines) — API key display + rotate
├── notification-settings.tsx (~180 lines) — Email, Slack, alert channels
├── region-settings.tsx   (~100 lines) — Data residency (US/EU)
├── sso-settings.tsx      (~150 lines) — SAML SSO configuration
└── scim-settings.tsx     (~120 lines) — SCIM token + status
```

**Why this split:**
- Each tab is independent (no shared state between tabs)
- Tab navigation is simple (no nested routing needed)
- Each component can be tested independently
- Hot reload is per-component (editing billing won't re-render general)

### 3.2 Projects Page Split (986 → ~5 components)

**Current state:** Single file with create form, project list, edit modal, delete confirmation.

**Target architecture:**

```
src/app/(dashboard)/projects/
├── page.tsx              (~60 lines) — Layout + state coordination
└── loading.tsx           (exists)

src/components/projects/
├── project-list.tsx      (~200 lines) — Grid/list of project cards
├── project-card.tsx      (~120 lines) — Single project card with actions
├── create-project-dialog.tsx (~200 lines) — Create form + URL verification
├── edit-project-dialog.tsx (~180 lines) — Edit form + settings
└── project-actions.tsx   (~80 lines) — Delete, scan, settings dropdown
```

### 3.3 Violations Page Split (742 → ~5 components)

**Current state:** Filters, violation list, bulk actions, detail modal.

**Target architecture:**

```
src/app/(dashboard)/violations/
├── page.tsx              (~60 lines) — Layout + filter state
└── loading.tsx           (exists)

src/components/violations/
├── violation-list.tsx    (~200 lines) — Table/grid of violations
├── violation-filters.tsx (~120 lines) — Severity, status, project filters
├── violation-detail.tsx  (~180 lines) — Detail modal with remediation
├── violation-actions.tsx (~80 lines) — Bulk update, export, status change
└── violation-row.tsx     (~60 lines) — Single violation row component
```

### 3.4 useApi.ts Split (337 → 6 focused hooks)

**Current state:** Single file with all React Query hooks.

**Target architecture:**

```
src/hooks/
├── index.ts              (~30 lines) — Re-exports all hooks (backward compat)
├── useProjects.ts        (~60 lines) — useProjects, useProject, useCreateProject
├── useViolations.ts      (~80 lines) — useViolations, useViolationStats, useBulkUpdate, useUpdateStatus
├── useScans.ts           (~60 lines) — useScans, useCreateScan, useScanProgress
├── useTrends.ts          (~30 lines) — useTrendData
├── useRemediation.ts     (~40 lines) — useRemediation, useGenerateRemediation
├── useAuth.ts            (90 lines, exists)
└── use-toast.ts          (193 lines, exists)
```

**Critical:** The `index.ts` barrel export ensures backward compatibility — all existing imports from `@/hooks/useApi` will continue to work without changes.

### 3.5 Roles Manager Split (304 → 3 components)

```
src/components/dashboard/
├── roles-manager.tsx     (~60 lines) — Main container with state
├── role-list.tsx         (~100 lines) — Role cards with actions
└── role-form.tsx         (~140 lines) — Create/edit form with permissions
```

### 3.6 Team Page Split (374 → 4 components)

```
src/app/(dashboard)/team/
├── page.tsx              (~50 lines) — Layout
└── loading.tsx           (exists)

src/components/team/
├── member-list.tsx       (~120 lines) — Team members grid
├── invite-form.tsx       (~100 lines) — Invite member form
├── pending-invites.tsx   (~80 lines) — Pending invite list
└── member-card.tsx       (~70 lines) — Single member card with role dropdown
```

### 3.7 Admin Page Split (367 → 3 components)

```
src/app/(dashboard)/admin/
├── page.tsx              (~50 lines) — Layout
└── loading.tsx           (exists)

src/components/admin/
├── feature-flags.tsx     (~120 lines) — Feature flag management
├── admin-overview.tsx    (~100 lines) — Admin dashboard data
└── admin-actions.tsx     (~80 lines) — Admin mutations
```

### 3.8 Reports Page Split (311 → 3 components)

```
src/app/(dashboard)/reports/
├── page.tsx              (~50 lines) — Layout
└── loading.tsx           (exists)

src/components/reports/
├── report-list.tsx       (~120 lines) — Report cards
├── generate-report.tsx   (~100 lines) — Generate form
└── share-links.tsx       (~80 lines) — Share link management
```

---

## 4. Design Token Fixes

### 4.1 Hardcoded Colors → Tokens

| File | Current | Replacement |
|------|---------|-------------|
| `audit-logs/page.tsx` | `text-gray-500 bg-gray-500/10` | `text-muted-foreground bg-muted` |
| `scans/page.tsx` | `bg-gray-500/10` | `bg-muted` |

### 4.2 Severity Colors (keep — these are semantic)

The `severity-pie.tsx` inline style `backgroundColor: item.color` is acceptable because severity colors are dynamic (from data, not theme).

---

## 5. SEO Metadata

### 5.1 Dashboard Pages — generateMetadata

All 8 dashboard pages currently have NO metadata. Add:

```typescript
export const metadata: Metadata = {
  title: 'Projects | AccessGuard',
  description: 'Manage your website accessibility monitoring projects',
};
```

| Page | Title | Description |
|------|-------|-------------|
| dashboard | Dashboard | Accessibility compliance overview |
| projects | Projects | Website monitoring projects |
| scans | Scan History | Accessibility scan history |
| violations | Violations | WCAG violation management |
| reports | Reports | Compliance report generation |
| settings | Settings | Organization settings |
| team | Team | Team member management |
| admin | Admin | Platform administration |
| audit-logs | Audit Logs | Security audit trail |

---

## 6. Turbopack Enable

**Change:** `next.config.ts` — `turbopack: false` → `turbopack: true`

**Impact:**
- Dev server startup: ~5s → ~1s
- Hot reload: ~2s → ~200ms
- Memory: reduced by ~30%
- No impact on production build

---

## 7. Implementation Order

| Phase | Task | Files Changed | Risk |
|-------|------|---------------|------|
| 1 | Settings page split | ~9 files | Medium (most complex) |
| 2 | Projects page split | ~6 files | Medium |
| 3 | Violations page split | ~6 files | Medium |
| 4 | useApi.ts split | ~7 files | High (backward compat) |
| 5 | Roles manager split | ~3 files | Low |
| 6 | Team page split | ~5 files | Low |
| 7 | Admin page split | ~4 files | Low |
| 8 | Reports page split | ~4 files | Low |
| 9 | Hardcoded colors fix | 2 files | Low |
| 10 | SEO metadata | 8 files | Low |
| 11 | Turbopack enable | 1 file | Low |
| 12 | Verify (typecheck + lint + tests) | — | — |

---

## 8. Verification Plan

After each phase:
1. `npx tsc -p tsconfig.check.json --noEmit` — 0 type errors
2. `npm test` — 323/323 tests passing
3. Manual check — dev server loads all pages

After all phases:
1. Full typecheck
2. Full test suite
3. Dev server restart + all pages load
4. Landing page renders correctly
5. Dashboard pages load with auth

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking imports during split | Barrel `index.ts` re-exports, no import changes needed |
| Settings tabs lose state | Each tab component manages its own state |
| useApi split breaks consumers | `index.ts` re-exports same API |
| Turbopack incompatibility | Test dev server after enable; revert if issues |
| Large diff size | Phase-by-phase commits |

---

## 10. Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Largest page file | 1307 lines | ~60 lines |
| Components > 200 lines | 6 | 0 |
| useApi.ts | 337 lines | ~30 lines (index) |
| Hardcoded colors | 8 instances | 0 |
| Missing metadata | 8 pages | 0 |
| Turbopack | OFF | ON |
| Total component files | 34 UI + 14 app | 34 UI + ~45 app (more, smaller) |
| Code maintainability | ⭐⭐ | ⭐⭐⭐⭐⭐ |
