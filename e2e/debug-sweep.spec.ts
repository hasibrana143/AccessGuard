import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

const pages = [
  '/dashboard',
  '/projects',
  '/violations',
  '/scans',
  '/reports',
  '/settings',
  '/settings?tab=appearance',
  '/settings?tab=team',
  '/settings?tab=github',
  '/settings?tab=notifications',
  '/settings?tab=billing',
  '/audit-logs',
  '/team',
  '/admin',
];

test.describe('Deep debug: console/network errors', () => {
  for (const path of pages) {
    test(`page ${path}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));
      page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`));
      page.on('response', (res) => {
        if (res.status() >= 500) failedRequests.push(`HTTP ${res.status()} ${res.url()}`);
        if (res.status() === 404 && !res.url().includes('/_next/static')) failedRequests.push(`HTTP 404 ${res.url()}`);
      });

      const response = await page.goto(path, { waitUntil: 'networkidle', timeout: 30000 });
      expect(response?.status() ?? 0, `HTTP status for ${path}`).toBeLessThan(500);
      await page.waitForTimeout(1500);

      const visible = await page.isVisible('text=Something went wrong', { timeout: 3000 }).catch(() => false);
      expect(visible, `${path}: error boundary shown`).toBe(false);

      if (consoleErrors.length || failedRequests.length) {
        console.log(`\n=== ${path} ===`);
        console.log(`CONSOLE (${consoleErrors.length}):`);
        consoleErrors.slice(0, 10).forEach((e) => console.log('  ', e.slice(0, 200)));
        console.log(`NETWORK (${failedRequests.length}):`);
        failedRequests.slice(0, 10).forEach((e) => console.log('  ', e.slice(0, 200)));
      }
      expect(consoleErrors.length, `${path}: console errors -> ${consoleErrors.slice(0, 5).join(' || ')}`).toBe(0);
      expect(failedRequests.length, `${path}: failed requests`).toBe(0);
    });
  }
});
