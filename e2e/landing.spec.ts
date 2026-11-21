import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display landing page with hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('ADA Lawsuits');
  });

  test('should have start button that routes an authenticated visitor to the dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const startButton = page.locator('button:has-text("Start Free Trial")').first();
    await expect(startButton).toBeVisible();
    await startButton.click();
    // The chromium project runs with an authenticated storage state, and the
    // landing CTA sends signed-in visitors to the dashboard (src/app/page.tsx).
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');
    const featuresSection = page.locator('#features');
    await featuresSection.scrollIntoViewIfNeeded();
    await expect(page.locator('text=Real WCAG Scanning')).toBeVisible();
    await expect(featuresSection.getByText('AI-Powered Remediation', { exact: true })).toBeVisible();
  });

  test('should display pricing section', async ({ page }) => {
    await page.goto('/');
    const pricingSection = page.locator('#pricing');
    await pricingSection.scrollIntoViewIfNeeded();
    await expect(page.locator('text=Starter')).toBeVisible();
    await expect(page.getByText('Agency', { exact: true })).toBeVisible();
    await expect(page.getByText('Enterprise', { exact: true })).toBeVisible();
  });
});
