// Scenario A: Authenticated API smoke (baseline) — docs/qa/LOAD_TESTING.md
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.AUTH_TOKEN;

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
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
  responses.forEach((r) => {
    check(r, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
  sleep(1);
}
