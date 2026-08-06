// Scenario C: AI Remediation (cost + latency) — docs/qa/LOAD_TESTING.md
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
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const headers = {
    Cookie: `next-auth.session-token=${TOKEN}`,
    'Content-Type': 'application/json',
  };

  const violationId = __ENV.VIOLATION_ID || 'violation_test_1';

  const start = Date.now();
  const res = http.post(
    `${BASE}/api/remediate`,
    JSON.stringify({ violationId, model: 'llama-3.3-70b' }),
    { headers }
  );

  aiLatency.add(Date.now() - start);
  check(res, {
    'remediation returned': (r) => r.status === 200,
    'has code': (r) => (r.json('remediationCode') || '').length > 0,
  });
}
