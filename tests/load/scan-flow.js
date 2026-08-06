// Scenario B: Scan creation + polling (heavy) — docs/qa/LOAD_TESTING.md
// Notes vs proposal: scans POST returns 200 (not 202); progress is SSE so
// polling uses the scans list endpoint (deterministic for k6).
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
    scan_duration: ['p(95)<30000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const headers = {
    Cookie: `next-auth.session-token=${TOKEN}`,
    'Content-Type': 'application/json',
  };

  const proj = http.post(
    `${BASE}/api/projects`,
    JSON.stringify({
      name: `Load Test ${__VU}-${__ITER}`,
      url: 'https://example.com',
    }),
    { headers }
  );
  check(proj, { 'project created': (r) => r.status === 201 });
  const projectId = proj.json('id');

  const scan = http.post(
    `${BASE}/api/scans`,
    JSON.stringify({ projectId, url: 'https://example.com' }),
    { headers }
  );
  check(scan, { 'scan queued': (r) => r.status === 200 });
  const scanId = scan.json('data.scan.id');

  const start = Date.now();
  for (let i = 0; i < 30; i++) {
    sleep(2);
    const list = http.get(`${BASE}/api/scans?projectId=${projectId}`, { headers });
    const scans = list.json('data') || [];
    const current = scans.find((s) => s.id === scanId);
    if (current && (current.status === 'completed' || current.status === 'failed')) {
      scanDuration.add(Date.now() - start);
      break;
    }
  }
}
