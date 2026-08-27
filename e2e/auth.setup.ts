import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate as test user', async ({ page }) => {
  await page.goto('/auth/login');
  
  // Accept cookies
  await page.locator('button:has-text("Essential Only")').click({ timeout: 5000 });
  
  await expect(page.locator('#email')).toBeVisible({ timeout: 5000 });

  await page.locator('#email').fill('test@accessguard.dev');
  await page.locator('#password').fill('testpass123');

  // Wait for navigation after submit
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  
  await page.waitForTimeout(1000);
  console.log('URL:', page.url());
  
  await page.context().storageState({ path: authFile });
});