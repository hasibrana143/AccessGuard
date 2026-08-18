import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Skip the onboarding wizard so it doesn't intercept clicks
    await page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
    await page.goto('/dashboard');
  });

  test('should display dashboard with stats', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 8000 });
  });

  test('should navigate to projects from sidebar', async ({ page }) => {
    const projectsLink = page.locator('nav').getByText('Projects', { exact: true });
    await expect(projectsLink).toBeVisible({ timeout: 8000 });
    await projectsLink.click();
    await expect(page).toHaveURL(/\/projects/, { timeout: 8000 });
  });

  test('should navigate to violations from sidebar', async ({ page }) => {
    const violationsLink = page.locator('nav').getByText('Violations', { exact: true });
    await expect(violationsLink).toBeVisible({ timeout: 8000 });
    await violationsLink.click();
    await expect(page).toHaveURL(/\/violations/, { timeout: 8000 });
  });

  test('should navigate to scans from sidebar', async ({ page }) => {
    const scansLink = page.locator('nav').getByText('Scans', { exact: true });
    await expect(scansLink).toBeVisible({ timeout: 8000 });
    await scansLink.click();
    await expect(page).toHaveURL(/\/scans/, { timeout: 8000 });
  });

  test('should navigate to reports from sidebar', async ({ page }) => {
    const reportsLink = page.locator('nav').getByText('Reports', { exact: true });
    await expect(reportsLink).toBeVisible({ timeout: 8000 });
    await reportsLink.click();
    await expect(page).toHaveURL(/\/reports/, { timeout: 8000 });
  });

  test('should navigate to settings from sidebar', async ({ page }) => {
    const settingsLink = page.locator('nav').getByText('Settings', { exact: true });
    await expect(settingsLink).toBeVisible({ timeout: 8000 });
    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings/, { timeout: 8000 });
  });
});
