import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate as test user', async ({ page }) => {
  // Listen for console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/auth/login');
  await expect(page.locator('#email')).toBeVisible({ timeout: 5000 });

  // Fill form
  await page.locator('#email').fill('test@accessguard.dev');
  await page.locator('#password').fill('testpass123');

  // Click submit and wait
  await page.locator('button[type="submit"]').click();

  // Wait for navigation (either redirect or stay)
  await page.waitForTimeout(3000);

  // Log current URL for debugging
  console.log('Current URL:', page.url());
  if (errors.length > 0) {
    console.log('Console errors:', errors.join(', '));
  }

  // Take screenshot for debugging
  await page.screenshot({ path: 'playwright/.auth/debug-login.png' });

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
