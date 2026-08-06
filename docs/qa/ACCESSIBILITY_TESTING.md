# Volume 8 — Accessibility Testing

## 1. Current state (verified)

### Tooling
- **axe-core** via `@axe-core/playwright` (Playwright integration)
- **Tags tested**: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`
- **Disabled rules**: `region`, `landmark-one-main` (known false positives in layout)
- **Scope**: 7 pages (login, landing, dashboard, projects, violations, settings) — both unauthenticated and authenticated

### Test file: `e2e/a11y.spec.ts` (9 tests)
| Test | Page | Auth |
| --- | --- | --- |
| Login page WCAG A/AA | `/auth/login` | Unauthenticated |
| Landing page WCAG A/AA | `/` | Unauthenticated |
| Login page (duplicate) | `/auth/login` | Authenticated |
| Dashboard WCAG A/AA | `/dashboard` | Authenticated |
| Projects page WCAG A/AA | `/projects` | Authenticated |
| Violations page WCAG A/AA | `/violations` | Authenticated |
| Settings page WCAG A/AA | `/settings` | Authenticated |
| Skip link focus order | `/dashboard` | Keyboard nav test |

### CI integration
- Runs in `playwright` project (chromium, authenticated via `storageState`)
- Part of `npm run test:e2e` → blocks merge on violations

## 2. Gaps

| Gap | Impact |
| --- | --- |
| **No scanner results page tested** | `/scans/[id]` (dynamic, violation list) — highest violation density |
| **No remediation modal tested** | AI fix dialog — complex interactive component |
| **No GitHub PR preview tested** | Diff view, file tree — custom components |
| **No dark mode contrast tested** | Only light theme runs (storageState doesn't preserve theme) |
| **No focus management tests beyond skip link** | Modals, drawers, toast, dropdown traps |
| **No screen reader (NVDA/VoiceOver) smoke test** | axe-core is static analysis only |
| **No CI gate for new pages** | New routes can be added without a11y test |
| **Disabled rules not documented** | `region`, `landmark-one-main` — why disabled? |

## 3. Target coverage (per page)
| Page | Static (axe) | Keyboard | Screen reader | Dark mode |
| --- | --- | --- | --- | --- |
| Landing | ✅ | ❌ | ❌ | ❌ |
| Login/Register | ✅ | ❌ | ❌ | ❌ |
| Dashboard | ✅ | ✅ (skip link) | ❌ | ❌ |
| Projects list | ✅ | ❌ | ❌ | ❌ |
| Project detail | ❌ | ❌ | ❌ | ❌ |
| Violations list | ✅ | ❌ | ❌ | ❌ |
| Scan results (violations) | ❌ | ❌ | ❌ | ❌ |
| Remediation modal | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ | ❌ | ❌ | ❌ |
| Settings (all tabs) | ✅ | ❌ | ❌ | ❌ |
| Team / Audit logs | ❌ | ❌ | ❌ | ❌ |

## 4. Recommended test structure
```
e2e/a11y/
├── pages/                    # Page object + a11y test per route
│   ├── landing.a11y.spec.ts
│   ├── login.a11y.spec.ts
│   ├── dashboard.a11y.spec.ts
│   ├── projects.a11y.spec.ts
│   ├── scan-results.a11y.spec.ts
│   ├── remediation.a11y.spec.ts
│   ├── reports.a11y.spec.ts
│   └── settings.a11y.spec.ts
├── components/               # Component-level a11y (modals, tables, forms)
│   ├── modal.a11y.spec.ts
│   ├── data-table.a11y.spec.ts
│   ├── toast.a11y.spec.ts
│   └── dropdown.a11y.spec.ts
├── keyboard/                 # Focus management, tab order, shortcuts
│   ├── skip-links.spec.ts
│   ├── modal-trap.spec.ts
│   └── roving-tabindex.spec.ts
├── themes/                   # Dark/light contrast
│   └── contrast.spec.ts
└── screen-reader/            # NVDA/VoiceOver smoke (manual or CI with assistive tech)
    └── smoke.spec.ts
```

## 5. CI gate (enforce on every PR)
```yaml
# In ci.yml or dedicated a11y.yml
- name: Accessibility tests
  run: npx playwright test e2e/a11y --project=chromium
```
- **Fail threshold**: 0 new violations (baseline = current 0 violations on tested pages)
- **Baseline update**: Only via `UPDATE_A11Y_BASELINE=true` workflow_dispatch (reviewed)

## 6. Dark mode testing
- Current `storageState` only stores cookies/localStorage — **not** `theme` cookie or `localStorage.theme`
- Fix: `test.use({ storageState: ..., colorScheme: 'dark' })` or explicit `page.emulateMedia({ colorScheme: 'dark' })`
- Run full a11y suite in both `light` and `dark` projects

## 7. Immediate actions
1. Add `scan-results.a11y.spec.ts` + `remediation.a11y.spec.ts` (highest risk)
2. Run a11y suite in dark mode (add `colorScheme` project)
3. Document disabled rules with justification (inline comment + this doc)
4. Add component-level tests for `Modal`, `DataTable`, `Toast`, `Dropdown` (focus trap, ARIA)
5. Add CI gate: new page = new a11y test file (enforced by CODEOWNERS or lint rule)

## 8. Metrics
| Metric | Current | Target |
| --- | --- | --- |
| **Pages covered (axe)** | 7/15 | 15/15 |
| **Components covered** | 0/12 | 12/12 |
| **Keyboard tests** | 1 | 10+ |
| **Dark mode** | 0 | 15 pages |
| **CI gate** | Runs in e2e | Dedicated gate, blocks merge |