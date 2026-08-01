import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (axe-core)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('onboarding-seen', 'true'));
  });

  test.describe('unauthenticated pages', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('login page has no WCAG A/AA violations', async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page.locator('h1')).toContainText('Welcome Back', { timeout: 8000 });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(['region', 'landmark-one-main'])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations.map((v) => v.id), null, 2)).toEqual([]);
    });
  });

  test('landing page has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['region', 'landmark-one-main'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id), null, 2)).toEqual([]);
  });

  test('login page has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('h1')).toContainText('Welcome Back', { timeout: 8000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['region', 'landmark-one-main'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id), null, 2)).toEqual([]);
  });

  test('dashboard has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 8000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['region', 'landmark-one-main'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id), null, 2)).toEqual([]);
  });

  test('projects page has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/, { timeout: 8000 });
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['region', 'landmark-one-main'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id), null, 2)).toEqual([]);
  });

  test('violations page has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/violations');
    await expect(page).toHaveURL(/\/violations/, { timeout: 8000 });
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['region', 'landmark-one-main'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id), null, 2)).toEqual([]);
  });

  test('settings page has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/, { timeout: 8000 });
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['region', 'landmark-one-main'])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations.map((v) => v.id), null, 2)).toEqual([]);
  });

  test('keyboard: skip link is first focusable and jumps to main content', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard', { timeout: 8000 });

    const skipLink = page.locator('a[href="#main-content"]');
    await page.evaluate(() => document.body.focus());
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
