# Volume 8 — Load Testing (k6)

## 1. Current state
- **No load testing** — not in CI, no scripts, no baseline.
- **SLO targets** (from MONITORING.md):
  - API availability 99.9%
  - Scan latency p95 < 30s
  - AI remediation p95 < 15s
  - Error rate < 0.1%

## 2. Tool choice: k6
- **Why**: TypeScript-like JS, CI-friendly, Prometheus output, thresholds, scenarios, cloud-ready
- **Install**: `npm i -D k6` (or `brew install k6` / Docker `grafana/k6`)
- **Repo location**: `tests/load/`

## 3. Test scenarios (priority order)

### Scenario A: Authenticated API smoke (baseline)
```javascript
// tests/load/smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.AUTH_TOKEN; // pre-authenticated session cookie

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up
    { duration: '1m', target: 10 },   // steady
    { duration: '30s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],     // 95th percentile < 500ms
    http_req_failed: ['rate<0.01'],       // error rate < 1%
    errors: ['rate<0.01'],
  },
};

export default function () {
  const headers = { Cookie: `next-auth.session-token=${TOKEN}` };
  const responses = http.batch([
    ['GET', `${BASE}/api/projects`, null, { headers }],
    ['GET', `${BASE}/api/scans`, null, { headers }],
    ['GET', `${BASE}/api/violations`, null, { headers }],
  ]);
  responses.forEach(r => {
    check(r, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
  sleep(1);
}
```

### Scenario B: Scan creation + polling (heavy)
```javascript
// tests/load/scan-flow.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const scanDuration = new Trend('scan_duration');
const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.AUTH_TOKEN;

export const options = {
  scenarios: {
    scan_creation: {
      executor: 'ramping-vus',
      stages: [
        { target: 5, duration: '1m' },
        { target: 5, duration: '3m' },
        { target: 0, duration: '30s' },
      ],
    },
  },
  thresholds: {
    scan_duration: ['p(95)<30000'],  // 30s p95
    http_req_failed: ['rate<0.05'],
  },
}

export default function () {
  const headers = { Cookie: `next-auth.session-token=${TOKEN}`, 'Content-Type': 'application/json' };
  
  // 1. Create project
  const proj = http.post(`${BASE}/api/projects`, JSON.stringify({
    name: `Load Test ${__VU}-${__ITER}`,
    url: 'https://example.com',
  }), { headers });
  check(proj, { 'project created': (r) => r.status === 201 });
  const projectId = proj.json('id');
  
  // 2. Trigger scan
  const scan = http.post(`${BASE}/api/scans`, JSON.stringify({
    projectId,
    url: 'https://example.com',
  }), { headers });
  check(scan, { 'scan queued': (r) => r.status === 202 });
  const scanId = scan.json('id');
  
  // 3. Poll for completion (max 60s)
  const start = Date.now();
  for (let i = 0; i < 30; i++) {
    sleep(2);
    const status = http.get(`${BASE}/api/scans/${scanId}`, { headers });
    if (status.json('status') === 'completed') {
      scanDuration.add(Date.now() - start);
      break;
    }
  }
}
```

### Scenario C: AI Remediation (cost + latency)
```javascript
// tests/load/ai-remediate.js
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const aiLatency = new Trend('ai_remediation_latency');
const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.AUTH_TOKEN;

export const options = {
  stages: [
    { target: 3, duration: '30s' },
    { target: 3, duration: '1m' },
    { target: 0, duration: '30s' },
  ],
  thresholds: {
    ai_remediation_latency: ['p(95)<15000'],
    http_req_failed: ['rate<0.1'],  // higher tolerance for AI provider flakiness
  },
};

export default function () {
  const headers = { Cookie: `next-auth.session-token=${TOKEN}`, 'Content-Type': 'application/json' };
  
  // Pick a violation that exists (pre-seeded)
  const violationId = __ENV.VIOLATION_ID || 'violation_test_1';
  
  const start = Date.now();
  const res = http.post(`${BASE}/api/remediate`, JSON.stringify({
    violationId,
    model: 'llama-3.3-70b',
  }), { headers });
  
  aiLatency.add(Date.now() - start);
  check(res, { 
    'remediation returned': (r) => r.status === 200,
    'has code': (r) => r.json('remediationCode')?.length > 0,
  });
}
```

## 4. CI integration (`.github/workflows/load.yml`)
```yaml
name: Load Tests
on:
  workflow_dispatch:
    inputs:
      scenario:
        type: choice
        options: [smoke, scan-flow, ai-remediate, all]
        default: smoke
  schedule:
    - cron: '0 3 * * 0'  # weekly Sunday 03:00 UTC

jobs:
  load:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: accessguard, POSTGRES_PASSWORD: accessguard_secret, POSTGRES_DB: accessguard_test }
        ports: [5432:5432]
        options: >-
          --health-cmd "pg_isready -U accessguard"
          --health-interval 5s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npm run dev &
        env:
          DATABASE_URL: postgresql://accessguard:accessguard_secret@localhost:5432/accessguard_test
          REDIS_URL: redis://localhost:6379
          NEXTAUTH_SECRET: load-test-secret
      - name: Wait for dev server
        run: sleep 30 && curl -f http://localhost:3000/api/health/live
      - name: Seed test data + auth token
        run: |
          # run seed, login, extract session cookie → AUTH_TOKEN
          echo "AUTH_TOKEN=..." >> $GITHUB_ENV
      - name: Run k6
        uses: grafana/k6-action@v0.2
        with:
          filename: tests/load/${{ github.event.inputs.scenario }}.js
          env: |
            BASE_URL=http://localhost:3000
            AUTH_TOKEN=${{ env.AUTH_TOKEN }}
      - name: Upload k6 report
        uses: actions/upload-artifact@v4
        with:
          name: k6-report
          path: k6-report.html
```

## 5. Pre-seeded test data (required)
- `violation_test_1` — known violation for AI remediation load test
- `project_load_test` — pre-created project for scan flow
- Test org + user with known credentials (seeded in `load-test-seed.ts`)

## 6. Metrics to capture & alert
| Metric | Source | SLO | Alert |
| --- | --- | --- | --- |
| `http_req_duration` (p95) | k6 | < 500ms (API) | > 1s for 5m |
| `scan_duration` (p95) | k6 custom | < 30s | > 45s |
| `ai_remediation_latency` (p95) | k6 custom | < 15s | > 25s |
| `http_req_failed` rate | k6 | < 1% | > 5% |
| `vus` (concurrent users) | k6 | — | capacity planning |

## 7. Immediate roadmap
| Week | Deliverable | Status |
| --- | --- | --- |
| 1 | Add `k6` devDep; create `tests/load/smoke.js`; run locally against dev server | ✅ done (k6 via CLI/Docker `grafana/k6` — npm `k6` is a placeholder) |
| 2 | Add `scan-flow.js` + `ai-remediate.js`; create `load-test-seed.ts` | ✅ done |
| 3 | Add `load.yml` workflow (manual dispatch); verify in CI | ✅ done |
| 4 | Add weekly scheduled run; baseline SLO metrics in Grafana | ⏳ open |
| 5 | Add soak test (1h @ 10 VUs) for memory leak detection | ✅ done (`tests/load/soak.js`, `npm run test:load:soak`) |

## 8. Local run commands
```bash
# Start dev stack
docker compose up -d
npm run dev &

# Seed test data
npx tsx tests/load/load-test-seed.ts

# Extract session cookie (manual or scripted)
# Run k6
k6 run tests/load/smoke.js -e BASE_URL=http://localhost:3000 -e AUTH_TOKEN=<cookie>
```