// Scenario D: Soak test (1h @ 10 VUs) — docs/qa/LOAD_TESTING.md step 5.
// Sustained steady-state load to expose memory leaks and slow degradation.
// Watch: memory growth of the Next process; p(95) should stay flat for 1h.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.AUTH_TOKEN;

export const options = {
  vus: 10,
  duration: '1h',
  thresholds: {
    http_req_duration: ['p(95)<800'],
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
    ['GET', `${BASE}/api/stats/usage`, null, { headers }],
  ]);
  responses.forEach((r) => {
    check(r, { 'status 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
  sleep(2);
}
