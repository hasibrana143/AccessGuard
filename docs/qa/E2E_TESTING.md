# Volume 8 — E2E Testing (Playwright)

## 1. Current state (verified)

### Configuration (`playwright.config.ts`)
- **testDir**: `./e2e`
- **fullyParallel**: `false` (serial — single dev server)
- **retries**: 2 (CI), workers: 1
- **reporter**: `html` (artifact on failure)
- **webServer**: `npm run dev` on `localhost:3000`, reuse in local, fresh in CI (180s timeout)
- **projects**: `setup` (auth) → `chromium` (Desktop Chrome, stored auth state)
- **baseURL**: `http://localhost:3000`

### Test inventory (11 files, 80 tests)
| File | Tests | Focus |
| --- | --- | --- |
| `auth.setup.ts` | 1 | Login + store `playwright/.auth/user.json` |
| `auth.spec.ts` | 3 | Login, logout, session persistence |
| `smoke.spec.ts` | 12 | All page loads, error detection, sidebar nav |
| `landing.spec.ts` | 4 | Hero, features, pricing, CTA |
| `projects.spec.ts` | 6 | Projects/Violations/Scans/Reports/Settings pages |
| `dashboard.spec.ts` | 4 | Dashboard widgets, chart render |
| `a11y.spec.ts` | 9 | axe-core WCAG A/AA on 7 pages + keyboard skip link |
| `debug-api.spec.ts` | 5 | API endpoint deep debug |
| `debug-overlay.spec.ts` | 1 | Modal screenshot |
| `debug-scan.spec.ts` | 1 | Full scan flow (create project → scan example.com) |
| `debug-sweep.spec.ts` | 17 | Console/network error sweep across 13 pages |

### Patterns
- **Error detection**: `page.on('console'/'pageerror'/'response')` → fail on unexpected errors (400+ responses, console errors)
- **Auth**: `storageState` reused across tests; `auth.setup.ts` runs first
- **Onboarding bypass**: `localStorage.setItem('onboarding-seen', 'true')` in `beforeEach`
- **Selectors**: Role-based (`h1:has-text("...")`) + semantic; minimal CSS selectors

## 2. Gaps

| Gap | Impact | Priority |
| --- | --- | --- |
| **No critical user journeys** | Scan creation → results → remediation → GitHub PR not tested end-to-end | Critical |
| **No multi-user / org-switching tests** | Cross-tenant isolation not verified in browser | High |
| **No MFA / password reset flows** | Auth edge cases untested | Medium |
| **No mobile viewport tests** | Responsive breakpoints unverified | Medium |
| **No visual regression** | UI drift undetected | Low |
| **Single browser (Chromium)** | Firefox/Safari/WebKit gaps | Low |
| **Flaky `waitForLoadState('networkidle')`** | Timing-dependent, slows suite | Medium |
| **Debug specs committed** | `debug-*.spec.ts` pollute CI (17 tests) | High (remove/move) |

## 3. Target critical journeys (to add)
1. **Happy path**: Login → Create Project → Run Scan → View Violations → Request AI Remediation → Open GitHub PR
2. **Org switch**: User in 2 orgs → switch org → verify data isolation (projects, scans, violations)
3. **Team invite**: Admin invites member → member accepts → verify permissions
4. **Billing**: Subscribe → manage subscription → cancel (Stripe test mode)
5. **Settings tabs**: Appearance (dark mode), GitHub connect, Notifications, Billing, Team

## 4. Selectors & resilience
- **Preferred**: `page.getByRole()`, `page.getByLabel()`, `page.getByText()`, `page.getByTestId()`
- **Avoid**: CSS classes (Tailwind hashes), `nth-child`, fragile XPaths
- **Add `data-testid`** to key interactive elements (buttons, forms, tables) — co-locate with component

## 5. CI hardening (proposed `playwright.ci.config.ts`)
```typescript
// Separate CI config for parallelism + multi-browser
export default defineConfig({
  ...baseConfig,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
  ],
  // Retry flaky tests only in CI
  retries: process.env.CI ? 2 : 0,
});
```

## 6. Immediate actions
1. **Remove `debug-*.spec.ts`** from `e2e/` (move to `e2e/debug/` excluded from CI, or delete)
2. **Add `critical-journeys.spec.ts`** with the 5 journeys above
3. **Replace `waitForLoadState('networkidle')`** with explicit `waitForSelector` / `waitForResponse` for key API calls
4. **Add mobile viewport project** (Pixel 5 / iPhone 12) in CI config
5. **Add visual regression** (optional): `@playwright/test` + `pixelmatch` for key screens

## 7. Metrics
| Metric | Current | Target |
| --- | --- | --- |
| **Test count** | 80 (incl. 17 debug) | 60+ critical + 20 regression |
| **CI duration** | ~3-4 min (serial) | < 5 min (parallel 2 workers) |
| **Flake rate** | Unknown (no history) | < 1% |
| **Browser matrix** | Chromium only | Chromium + Firefox + WebKit + 2 mobile |