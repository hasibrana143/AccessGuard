import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

const endpoints: Array<{ method: 'GET' | 'POST'; path: string; body?: unknown; expectOk?: boolean; expectJson?: boolean }> = [
  { method: 'GET', path: '/api/stats/trends' },
  { method: 'GET', path: '/api/stats/usage' },
  { method: 'GET', path: '/api/stats/regression', expectOk: false },
  { method: 'GET', path: '/api/projects' },
  { method: 'GET', path: '/api/scans' },
  { method: 'GET', path: '/api/violations' },
  { method: 'GET', path: '/api/reports/list' },
  { method: 'GET', path: '/api/audit-logs' },
  { method: 'GET', path: '/api/settings' },
  { method: 'GET', path: '/api/roles' },
  { method: 'GET', path: '/api/schedule' },
  { method: 'GET', path: '/api/team/members' },
  { method: 'GET', path: '/api/team/invite' },
  { method: 'GET', path: '/api/team/pending-invites' },
  { method: 'GET', path: '/api/github/status' },
  { method: 'GET', path: '/api/github/repos' },
  { method: 'GET', path: '/api/flags' },
  { method: 'GET', path: '/api/admin' },
  { method: 'GET', path: '/api/audit' },
  { method: 'GET', path: '/api/docs', expectJson: false },
  { method: 'GET', path: '/api/stripe/subscription' },
  { method: 'GET', path: '/api/stripe/invoices' },
  { method: 'POST', path: '/api/stripe/create-customer', expectOk: false },
];

test.describe('Deep debug: API sweep', () => {
  for (const ep of endpoints) {
    test(`${ep.method} ${ep.path}`, async ({ page }) => {
      const res = await page.request.fetch(`http://localhost:3000${ep.path}`, { method: ep.method, data: ep.body });
      const status = res.status();
      const body = await res.text();
      const is500 = status >= 500;
      const is401 = status === 401;

      if (status >= 400) {
        console.log(`${ep.method} ${ep.path} -> ${status} :: ${body.slice(0, 150)}`);
      }

      expect(status, `${ep.method} ${ep.path} -> ${status}: ${body.slice(0, 150)}`).toBeGreaterThanOrEqual(200);
      expect(status, `${ep.method} ${ep.path} 500 error`).toBeLessThan(500);

      if (!is500 && !is401 && body.trim().length > 0) {
        if (ep.expectJson === false) {
          expect(status, `${ep.method} ${ep.path} should be a 2xx`).toBeLessThan(300);
          return;
        }
        const json = JSON.parse(body);
        if (ep.expectOk === false) {
          expect(json.success).toBe(false);
        } else {
          expect(json.success, `${ep.path}: success flag`).toBe(true);
        }
      }
    });
  }
});
