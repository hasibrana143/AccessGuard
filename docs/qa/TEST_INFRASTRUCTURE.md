# Volume 8 — Test Infrastructure & Hardening

## 1. Current CI pipeline (`.github/workflows/ci.yml`)
| Stage | Command | Time | Artifacts |
| --- | --- | --- | --- |
| Setup | `actions/checkout@v4` + `setup-node@v4` (Node 22, npm cache) | ~30s | — |
| Install | `npm ci` | ~60s | `node_modules` cached |
| DB | `prisma generate` + `db push` + `db:constraints` + `db:seed` | ~45s | Test DB ready |
| Lint | `npm run lint` | ~15s | — |
| Test | `vitest run --coverage` | ~10s | Coverage HTML/JSON |
| Build | `npm run build` | ~60s | `.next/standalone` |
| Audit | `npm audit --audit-level=high` | ~10s | — |
| E2E | `playwright install` + `npm run test:e2e` | ~3-4m | Playwright report (on failure) |

**Total CI time**: ~7-8 minutes (serial, single worker)

## 2. Pain points (verified)
| Issue | Impact | Fix |
| --- | --- | --- |
| **Serial Playwright** (`fullyParallel: false`, `workers: 1`) | E2E = bottleneck | Parallelise with multiple browsers/workers |
| **Dev server in CI** (`webServer: npm run dev`) | Flaky startup, port conflicts | Use `npm run start` (standalone) or preview server |
| **No test sharding** | Can't scale horizontally | Add sharding for large suites |
| **Coverage threshold low (40%)** | Green CI ≠ well-tested | Raise progressively (see UNIT_TESTING.md) |
| **No test result history** | Flake detection hard | Upload JUnit XML + dashboard (Allure/Playwright trace) |
| **Debug specs in CI** | 17 debug tests waste time | Move to `e2e/debug/` excluded from CI |
| **Single browser** | Cross-browser gaps | Add Firefox + WebKit + mobile |
| **No contract testing** | API drift between FE/BE | Add Pact or OpenAPI validation |

## 3. Target CI architecture (after hardening)

```
ci.yml (PR + push to main)
├─ lint (2m)
├─ typecheck (source-only, 1m)
├─ unit (vitest, 30s)
├─ integration (testcontainers, 2m) ← NEW
├─ build (1m)
├─ audit (30s)
├─ sast (semgrep, 1m) ← NEW
├─ secrets (trufflehog, 30s) ← NEW
├─ e2e-chromium (parallel, 2m)
├─ e2e-firefox (parallel, 2m)
├─ e2e-webkit (parallel, 2m)
├─ e2e-mobile (parallel, 2m)
└─ a11y (dedicated, 1m)
```
**Target total**: < 10 min (parallel) with all gates.

## 4. Infrastructure improvements (immediate)

### 4.1 Parallel E2E with sharding
```yaml
# playwright.config.ts (CI override)
export default defineConfig({
  ...base,
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'], storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] },
  ],
  // Shard across CI runners (if using multiple machines)
  shard: process.env.CI_SHARD ? { total: 2, current: parseInt(process.env.CI_SHARD) } : undefined,
});
```

### 4.2 Standalone server in CI (replace `npm run dev`)
```yaml
# ci.yml — replace webServer + dev
- run: npm run build
- run: npm run start &
    env:
      PORT: 3000
      DATABASE_URL: ...
      NODE_ENV: production
- run: sleep 10 && curl -f http://localhost:3000/api/health/live
```
- Faster startup (no compilation), production-like, no `.next` corruption

### 4.3 Test result dashboard
- **JUnit XML**: `vitest run --reporter=junit --outputFile=junit.xml`
- **Playwright JUnit**: `npx playwright test --reporter=junit,line`
- **Upload**: `actions/upload-artifact@v4` + GitHub Actions summary
- **Dashboard**: Allure / Playwright Trace Viewer / custom Grafana

### 4.4 Flake detection & quarantine
```yaml
# In ci.yml after test steps
- name: Detect flaky tests
  if: always()
  run: |
    # Parse JUnit XML, compare with previous runs (stored in GCS/S3)
    # Fail if new flakes > threshold
```
- Quarantine known flakes: `test.skip(..., { annotation: 'flaky' })` with issue link

### 4.5 Dependency caching optimisation
```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      ~/.cache/playwright
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}-${{ hashFiles('playwright.config.ts') }}
```

## 5. Local developer experience

### 5.1 One-command test run
```bash
# package.json scripts
"test:all": "npm run lint && npm run typecheck && npm test && npm run test:e2e",
"test:ci": "npm run lint && npx tsc -p tsconfig.check.json && vitest run --coverage && npx playwright test",
```

### 5.2 Pre-commit hooks (husky + lint-staged)
```json
// .husky/pre-commit
npx lint-staged
```
```json
// package.json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml}": ["prettier --write"]
}
```

### 5.3 Test debugging helpers
- `npm run test:watch` → vitest watch mode
- `npm run test:e2e:ui` → Playwright UI mode
- `npm run test:e2e:headed` → headed browser for debugging
- `DEBUG=pw:api npx playwright test` → verbose protocol logs

## 6. Metrics & SLOs for test infrastructure

| Metric | Current | Target | Measurement |
| --- | --- | --- | --- |
| **CI duration (p95)** | ~8 min | < 10 min (with all gates) | GitHub Actions API |
| **CI success rate (main)** | Unknown | > 95% | Branch protection checks |
| **Flake rate** | Unknown | < 1% | Quarantine tracker |
| **Test execution time (unit)** | 5s | < 10s (at 500 tests) | vitest reporter |
| **Test execution time (e2e)** | 3-4m | < 5m (parallel) | Playwright reporter |
| **Coverage (statements)** | 40% | 75% (V9) | vitest coverage |
| **Coverage (branches)** | 40% | 70% (V9) | vitest coverage |

## 7. Roadmap (8-week sprint)

| Week | Focus | Deliverable |
| --- | --- | --- |
| 1 | Parallel E2E | Multi-browser config, remove debug specs, shard |
| 2 | Standalone CI | Replace `dev` with `start` in CI; add health endpoint |
| 3 | SAST/Secrets | semgrep + trufflehog in CI; SARIF upload |
| 4 | Integration tests | Testcontainers + first 3 integration suites |
| 5 | Coverage gate | Raise to 50%; add factory utils |
| 6 | Load tests | k6 smoke + scan-flow in CI (manual dispatch) |
| 7 | Security DAST | Access control + injection + auth tests |
| 8 | Dashboard + flakes | JUnit upload, Allure/Grafana, flake detection |

## 8. Immediate actions (this week)
1. **Delete/move `e2e/debug-*.spec.ts`** — they run in CI and waste 2+ minutes
2. **Add `api/health/live` + `api/health/ready` endpoints** (for CI readiness probe)
3. **Update `playwright.config.ts`** for parallel + multi-browser (CI only)
4. **Add `npm run typecheck` script** using `tsconfig.check.json` (source-only)
5. **Raise vitest coverage thresholds** to 50% statements/lines
6. **Add husky + lint-staged** for pre-commit quality gate