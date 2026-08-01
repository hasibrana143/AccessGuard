import { test, expect } from '@playwright/test';

test.describe('Projects View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
  });

  test('should display projects page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible({ timeout: 5000 });
  });

  test('should have add project button', async ({ page }) => {
    await expect(page.locator('button:has-text("Add Project")')).toBeVisible();
  });
});

test.describe('Violations View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/violations');
  });

  test('should display violations page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Violations")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Scans View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scans');
  });

  test('should display scans page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Scan History")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Reports View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
  });

  test('should display reports page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Reports")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Settings View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 5000 });
  });
});
