import { test, expect } from '@playwright/test';

test.describe('Status Page', () => {
  test('should render overall status with probe rows', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('h1')).toContainText(/All Systems Operational|Partial Outage/);
    await expect(page.locator('li:has-text("live")')).toBeVisible();
    await expect(page.locator('li:has-text("ready")')).toBeVisible();
    await expect(page.locator('text=Last checked:')).toBeVisible();
  });

  test('should be public (no auth redirect)', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveURL(/\/status$/);
  });
});
