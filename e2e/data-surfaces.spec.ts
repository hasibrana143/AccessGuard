import { test, expect } from '@playwright/test';

test.describe('Violations', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
    await page.goto('/violations');
  });

  test('violations page renders list or empty state', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  test('severity filter controls are present', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/critical|serious|moderate|minor|filter/i, {
      timeout: 8000,
    });
  });
});

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
    await page.goto('/reports');
  });

  test('reports page renders', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Scans', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
    await page.goto('/scans');
  });

  test('scans page renders history or empty state', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });
});
