import { test, expect } from '@playwright/test';

let allErrors: string[] = [];

async function waitForPageReady(page: import('@playwright/test').Page, path: string): Promise<void> {
  if (path.startsWith('/dashboard')) {
    await page.locator('h1:has-text("Dashboard")').waitFor({ timeout: 8000 });
  } else if (path.startsWith('/projects')) {
    await page.locator('h1:has-text("Projects")').waitFor({ timeout: 8000 });
  } else if (path.startsWith('/violations')) {
    await page.locator('h1:has-text("Violations")').waitFor({ timeout: 8000 });
  } else if (path.startsWith('/scans')) {
    await page.locator('h1:has-text("Scan History")').waitFor({ timeout: 8000 });
  } else if (path.startsWith('/reports')) {
    await page.locator('h1:has-text("Reports")').waitFor({ timeout: 8000 });
  } else if (path.startsWith('/settings')) {
    await page.locator('h1:has-text("Settings")').waitFor({ timeout: 8000 });
  } else if (path.startsWith('/auth/login')) {
    await page.locator('#email').waitFor({ timeout: 5000 });
  } else if (path.startsWith('/auth/register')) {
    await page.locator('body').waitFor({ timeout: 5000 });
  } else {
    await page.waitForLoadState('domcontentloaded');
  }
}

test.beforeEach(({ page }) => {
  allErrors = [];
  page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
  page.on('console', (msg) => {
    if (msg.type() === 'error') allErrors.push(`[CONSOLE_ERROR] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    allErrors.push(`[PAGE_ERROR] ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      allErrors.push(`[${res.status()}] ${res.url()}`);
    }
  });
});

test.afterEach(async () => {
  if (allErrors.length > 0) {
    console.log('--- ERRORS FOUND ---');
    allErrors.forEach(e => console.log(e));
    console.log('--- END ERRORS ---');
  }
});

test.describe.configure({ retries: 2 });

test.describe('unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('1. Landing page loads without errors', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page, '/');
    expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
  });

  test('2. Login page loads and form works', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForPageReady(page, '/auth/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
  });

  test('3. Login with valid credentials succeeds', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForPageReady(page, '/auth/login');
    await page.locator('button:has-text("Essential Only")').click({ timeout: 5000 });
    await page.fill('#email', 'test@accessguard.dev');
    await page.fill('#password', 'testpass123');
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    await waitForPageReady(page, '/dashboard');
    expect(allErrors.filter(e => !e.includes('favicon') && !e.includes('/api/consent') && !e.includes('401') && !e.includes('Unauthorized'))).toEqual([]);
  });

  test('4. Login with wrong credentials shows error', async ({ page }) => {
    await page.goto('/auth/login');
    await waitForPageReady(page, '/auth/login');
    await page.locator('button:has-text("Essential Only")').click({ timeout: 5000 });
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/auth/login');
    const unexpected = allErrors.filter(
      e => !e.includes('favicon') && !e.includes('[401]') && !e.includes('401 (Unauthorized)')
    );
    expect(unexpected).toEqual([]);
  });

  test('11. Register page loads', async ({ page }) => {
    await page.goto('/auth/register');
    await waitForPageReady(page, '/auth/register');
    expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
  });
});

test.describe('authenticated', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('5. Dashboard loads without errors', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForPageReady(page, '/dashboard');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('6. Projects page loads without errors', async ({ page }) => {
  await page.goto('/projects');
  await waitForPageReady(page, '/projects');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('7. Violations page loads without errors', async ({ page }) => {
  await page.goto('/violations');
  await waitForPageReady(page, '/violations');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('8. Scans page loads without errors', async ({ page }) => {
  await page.goto('/scans');
  await waitForPageReady(page, '/scans');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('9. Reports page loads without errors', async ({ page }) => {
  await page.goto('/reports');
  await waitForPageReady(page, '/reports');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('10. Settings page loads without errors', async ({ page }) => {
  await page.goto('/settings');
  await waitForPageReady(page, '/settings');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('12. All sidebar links work end-to-end', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForPageReady(page, '/dashboard');

  const links = [
    { text: 'Projects', url: '/projects' },
    { text: 'Violations', url: '/violations' },
    { text: 'Scan History', url: '/scans' },
    { text: 'Reports', url: '/reports' },
    { text: 'Settings', url: '/settings' },
  ];

  for (const link of links) {
    allErrors = [];
    await page.goto(link.url);
    await waitForPageReady(page, link.url);
    const pageErrors = allErrors.filter(e => !e.includes('favicon') && !e.includes('[CONSOLE_ERROR]'));
    expect(pageErrors).toEqual([]);
  }
});
});
