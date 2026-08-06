# Volume 8 — Unit Testing (vitest)

## 1. Current state (verified)

### Configuration (`vitest.config.ts`)
- **Environment**: `node` (not jsdom — tests run against real Prisma/DB)
- **Globals**: `true` (describe/it/expect without imports)
- **Include**: `src/**/*.{test,spec}.{ts,tsx}` (excludes `.next`, `node_modules`, `e2e`)
- **Coverage**: v8 provider, thresholds **40%** (statements/branches/functions/lines)
- **Timeout**: 10s test / 10s hook
- **Alias**: `@/*` → `./src/*`
- **Test env vars**: `NEXTAUTH_SECRET` set to test value

### Test inventory (22 files, 234 tests)
| Domain | Files | Tests | Focus |
| --- | --- | --- | --- |
| `src/ai/__tests__` | 3 | 20 | prompts, model-router, cost accounting |
| `src/app/api/__tests__` | 1 | 18 | tenant isolation (cross-org leaks) |
| `src/app/api/audit-logs` | 1 | 12 | admin-only listing, pagination |
| `src/app/api/projects` | 1 | 22 | CRUD, permissions, member invite |
| `src/app/api/roles` | 1 | 15 | custom role CRUD, permission matrix |
| `src/app/api/violations` | 1 | 24 | listing, filtering, bulk actions |
| `src/lib/__tests__` | 11 | 103 | rbac, permissions, queue, rate-limit, cron, github-pr, fix-validation, url-validation, error-logger, security, notification-settings |
| `src/services/scanner/__tests__` | 1 | 20 | dom-analysis strategy (regex patterns, edge cases) |

### Patterns observed
- **Test DB**: each file sets up its own Prisma transaction (rollback after) or uses shared test DB from CI
- **Auth mocking**: `getServerSession` mocked via `vi.mock('@/lib/auth')` or test-specific session helpers
- **RBAC testing**: `permissions.test.ts` + `rbac.test.ts` cover all 14 permissions × roles matrix
- **Scanner**: only `dom-analysis` has unit tests; `axe-core` and `fetch-analysis` untested at unit level
- **AI module**: full coverage (prompts parser, router fallback logic, cost estimation)

## 2. Gaps

| Area | Missing | Priority |
| --- | --- | --- |
| `axe-core` strategy unit tests | Strategy logic, error handling, violation mapping | High |
| `fetch-analysis` strategy unit tests | Regex extraction, CSP parsing, edge cases | High |
| Rate-limit integration tests | End-to-end with Redis (not just unit) | Medium |
| BullMQ job processor tests | Worker concurrency, retry/backoff, dead letter | Medium |
| Stripe webhook handler tests | Signature verification, idempotency | Low (manual verified) |
| Sentry integration tests | Error capture, breadcrumbs, release tagging | Low |

## 3. Coverage targets (progressive)
| Phase | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| **Current** | 40% | 40% | 40% | 40% |
| **V8 target** | 60% | 55% | 55% | 60% |
| **V9 target** | 75% | 70% | 70% | 75% |
| **Maturity** | 90% | 85% | 85% | 90% |

## 4. Conventions (enforced in PR review)
- File naming: `*.test.ts` (unit) / `*.spec.ts` (integration/e2e) — currently mixed, standardise to `.test.ts` for vitest
- One `describe` per module under test
- `beforeEach` / `afterEach` for DB cleanup (use `prisma.$transaction` rollback)
- No `test.only` / `test.skip` in committed code
- Mock external I/O (HTTP, Redis, Prisma) — test logic, not infrastructure
- Deterministic data: use factories (`createTestUser()`, `createTestOrg()`) not hardcoded IDs

## 5. CI integration
- `ci.yml` runs `vitest run --coverage` → artifacts uploaded
- Coverage thresholds enforced at 40% (will raise per roadmap)
- Run time ~5s (234 tests) — keep under 30s total

## 6. Immediate actions
1. Add unit tests for `axe-core` + `fetch-analysis` strategies (mirror `dom-analysis.test.ts` pattern)
2. Raise coverage thresholds to 50% in `vitest.config.ts`
3. Add factory helpers in `src/test/factories.ts` (consolidate current ad-hoc patterns)
4. Document test DB strategy in this doc (transaction rollback vs dedicated test DB)