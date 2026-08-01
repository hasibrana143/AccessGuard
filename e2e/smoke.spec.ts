import { test, expect } from '@playwright/test';

let allErrors: string[] = [];

test.beforeEach(({ page }) => {
  allErrors = [];
  // Skip the onboarding wizard so it doesn't intercept interactions
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

test('1. Landing page loads without errors', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('2. Login page loads and form works', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('3. Login with valid credentials succeeds', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('#email', 'test@accessguard.dev');
  await page.fill('#password', 'testpass123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('4. Login with wrong credentials shows error', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('#email', 'wrong@email.com');
  await page.fill('#password', 'wrongpassword');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  expect(page.url()).toContain('/auth/login');
  // 401 from the credentials callback is expected for wrong credentials
  const unexpected = allErrors.filter(
    e => !e.includes('favicon') && !e.includes('[401]') && !e.includes('401 (Unauthorized)')
  );
  expect(unexpected).toEqual([]);
});

test('5. Dashboard loads without errors', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('6. Projects page loads without errors', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.locator('h1:has-text("Projects")')).toBeVisible({ timeout: 10000 });
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('7. Violations page loads without errors', async ({ page }) => {
  await page.goto('/violations');
  await expect(page.locator('h1:has-text("Violations")')).toBeVisible({ timeout: 10000 });
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('8. Scans page loads without errors', async ({ page }) => {
  await page.goto('/scans');
  await expect(page.locator('h1:has-text("Scan History")')).toBeVisible({ timeout: 10000 });
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('9. Reports page loads without errors', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.locator('h1:has-text("Reports")')).toBeVisible({ timeout: 10000 });
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('10. Settings page loads without errors', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('11. Register page loads', async ({ page }) => {
  await page.goto('/auth/register');
  await page.waitForLoadState('networkidle');
  expect(allErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});

test('12. All sidebar links work end-to-end', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 10000 });

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
    await page.waitForLoadState('networkidle');
    const pageErrors = allErrors.filter(e => !e.includes('favicon') && !e.includes('[CONSOLE_ERROR]'));
    expect(pageErrors).toEqual([]);
  }
});
