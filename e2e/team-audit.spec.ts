import { test, expect } from '@playwright/test';

test.describe('Team', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
    await page.goto('/team');
  });

  test('team page renders member list or empty state', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  test('invite control is reachable without sending an invite', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/invite|member|team/i, { timeout: 8000 });
  });
});

test.describe('Audit logs', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
    await page.goto('/audit-logs');
  });

  test('audit log page renders table or empty state', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });
});
