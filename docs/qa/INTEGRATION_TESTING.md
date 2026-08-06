# Volume 8 — Integration Testing

## 1. Definition
Integration tests verify **module boundaries**: API route → service → DB → external service. They run against real dependencies (Testcontainers or dedicated test Postgres/Redis) but **not** through the browser.

## 2. Current state
- **No dedicated integration test suite** — vitest tests hit real Prisma/DB (via `prisma.$transaction` rollback) and count as "unit" in the current config.
- API route tests (`src/app/api/**/route.test.ts`) exercise full handler chain: auth → validation → service → Prisma → response.
- Scanner tests only cover `dom-analysis` strategy at unit level.
- No tests for: BullMQ worker processing, scheduler daemon, GitHub PR creation flow, Stripe webhook handling, email sending.

## 3. Recommended structure (new)
```
tests/integration/
├── api/                    # Full API route tests (real DB, real Redis)
│   ├── auth/               # login, register, MFA, session refresh
│   ├── projects/           # CRUD + member invite + transfer
│   ├── scans/              # create → queue → process → results
│   ├── violations/         # filtering, bulk ignore, export
│   ├── remediate/          # AI + template fallback + cost audit
│   ├── github/             # OAuth → PR creation → webhook (mocked)
│   └── billing/            # Stripe checkout, portal, webhook
├── services/
│   ├── scanner/            # full scan pipeline (Puppeteer + strategies)
│   ├── queue/              # BullMQ worker + scheduler (concurrency, retry)
│   ├── github/             # PR creation, comment, status checks
│   └── email/              # template render, send (mocked transport)
└── utils/
    ├── testcontainers.ts   # Postgres + Redis containers (CI & local)
    ├── factories.ts        # createTestUser, createTestOrg, createTestProject
    └── auth.ts             # createTestSession, mockGetServerSession
```

## 4. Testcontainers setup (CI & local)
```typescript
// tests/integration/utils/testcontainers.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

export async function startTestContainers(): Promise<{
  pg: StartedPostgreSqlContainer;
  redis: StartedRedisContainer;
  cleanup: () => Promise<void>;
}> {
  const pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('accessguard_test')
    .withUsername('accessguard')
    .withPassword('accessguard_secret')
    .start();

  const redis = await new RedisContainer('redis:7-alpine')
    .start();

  const cleanup = async () => {
    await pg.stop();
    await redis.stop();
  };

  return { pg, redis, cleanup };
}
```

## 5. CI integration (`.github/workflows/integration.yml`)
```yaml
name: Integration Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  integration:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    services: {}  # Testcontainers manages its own
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://accessguard:accessguard_secret@localhost:5432/accessguard_test
          REDIS_URL: redis://localhost:6379
          NEXTAUTH_SECRET: test-secret
```

## 6. Test data strategy
- **Factories** (not fixtures): `createTestOrg()`, `createTestProject()`, `createTestScan()`
  - Return plain objects + Prisma create calls
  - Scoped to test — cleaned up by transaction rollback
- **Isolation**: Each test file runs in its own transaction (or dedicated schema if parallel)
- **No shared state**: No global `beforeAll` that creates data reused across tests

## 7. Immediate roadmap
| Week | Deliverable |
| --- | --- |
| 1 | Add `@testcontainers/postgresql` + `@testcontainers/redis`; create `tests/integration/utils/testcontainers.ts` |
| 2 | Port existing API route tests to integration suite (real DB, no mock Prisma) |
| 3 | Add scanner pipeline integration test (headless Chromium in CI) |
| 4 | Add BullMQ worker integration test (job processed, retries, dead letter) |
| 5 | Add GitHub PR creation integration test (mocked GitHub API via MSW/nock) |
| 6 | Raise coverage gate to include integration tests in threshold |

## 8. Distinction from other layers
| Layer | Runs against | Speed | Scope |
| --- | --- | --- | --- |
| **Unit** (vitest) | Mocked deps, in-memory | ~5s | Single function/class |
| **Integration** | Real Postgres/Redis, mocked HTTP | ~30-60s | Module → DB → service |
| **E2E** (Playwright) | Real browser, full stack | ~2-5m | User flows |
| **Load** (k6) | Real stack, concurrency | ~10-30m | Performance/SLO |