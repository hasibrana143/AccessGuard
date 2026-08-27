import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate as test user', async ({ page }) => {
  await page.goto('/auth/login');
  
  // Accept cookies
  await page.locator('button:has-text("Essential Only")').click({ timeout: 5000 });
  
  await expect(page.locator('#email')).toBeVisible({ timeout: 5000 });

  await page.locator('#email').fill('test@accessguard.dev');
  await page.locator('#password').fill('testpass123');

  // Capture network response
  const responsePromise = page.waitForResponse(resp => resp.url().includes('/api/auth/callback/credentials'));
  await page.locator('button[type="submit"]').click();
  
  try {
    const response = await responsePromise;
    console.log('Auth response:', response.status(), await response.text());
  } catch (e) {
    console.log('No auth response:', e.message);
  }
  
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await page.context().storageState({ path: authFile });
});