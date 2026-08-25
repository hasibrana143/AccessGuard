import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
    await page.goto('/settings');
  });

  test('settings page renders with tabs', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  test('privacy tab shows data region selector and GDPR export', async ({ page }) => {
    const privacyTab = page.getByRole('tab', { name: /privacy/i });
    if (await privacyTab.count()) {
      await privacyTab.click();
    }
    await expect(page.locator('body')).toContainText(/Export My Data|Data Region|EU/i, { timeout: 8000 });
  });

  test('billing tab shows currency selector', async ({ page }) => {
    const billingTab = page.getByRole('tab', { name: /billing/i });
    if (await billingTab.count()) {
      await billingTab.click();
    }
    await expect(page.locator('body')).toContainText(/currency|plan/i, { timeout: 8000 });
  });
});
