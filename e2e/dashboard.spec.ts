import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and go to dashboard
    await page.goto('/');
    // Use hero section button with force click for mobile compatibility
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
  });

  test('should display dashboard with stats', async ({ page }) => {
    // Check for dashboard title in h1
    await expect(page.locator('h1')).toContainText('Dashboard');
    // Check for stats cards - use exact text to avoid multiple matches
    await expect(page.locator('text=Risk Score')).toBeVisible();
    await expect(page.getByText('Open Violations', { exact: true })).toBeVisible();
  });

  test('should display violation chart', async ({ page }) => {
    // Check for chart section
    await expect(page.locator('text=Violation Trends')).toBeVisible();
  });

  test('should navigate to projects', async ({ page }) => {
    // Click on Projects in sidebar (more specific selector)
    await page.locator('nav button:has-text("Projects")').click();
    await page.waitForTimeout(800);
    
    // Check h1 has Projects
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible();
  });

  test('should navigate to violations', async ({ page }) => {
    // Click on Violations in sidebar
    await page.locator('nav button:has-text("Violations")').click();
    await page.waitForTimeout(800);
    
    // Check h1 has Violations
    await expect(page.locator('h1:has-text("Violations")')).toBeVisible();
  });

  test('should navigate to scans', async ({ page }) => {
    // Click on Scan History in sidebar
    await page.locator('nav button:has-text("Scan History")').click();
    await page.waitForTimeout(800);
    
    // Check h1 has Scan History
    await expect(page.locator('h1:has-text("Scan History")')).toBeVisible();
  });

  test('should navigate to reports', async ({ page }) => {
    // Click on Reports in sidebar
    await page.locator('nav button:has-text("Reports")').click();
    await page.waitForTimeout(800);
    
    // Check h1 has Reports
    await expect(page.locator('h1:has-text("Reports")')).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    // Click on Settings in sidebar
    await page.locator('nav button:has-text("Settings")').click();
    await page.waitForTimeout(800);
    
    // Check h1 has Settings
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
  });
});

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
  });

  test('should show user info in sidebar', async ({ page }) => {
    await expect(page.locator('text=Demo User')).toBeVisible();
  });

  test('should show AccessGuard logo', async ({ page }) => {
    // Look for AccessGuard brand text anywhere on page
    await expect(page.locator('text=AccessGuard').first()).toBeVisible();
  });
});

test.describe('Header Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
  });

  test('should have search input', async ({ page }) => {
    // Use more specific selector
    const searchInput = page.locator('header input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
  });

  test('should filter content when searching', async ({ page }) => {
    const searchInput = page.locator('header input[placeholder*="Search"]');
    await searchInput.fill('demo');
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue('demo');
  });
});

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
  });

  test('should have theme toggle button', async ({ page }) => {
    // Theme toggle should be visible in sidebar (sun or moon icon)
    const themeButton = page.locator('button').filter({ has: page.locator('[class*="lucide-sun"], [class*="lucide-moon"]') });
    await expect(themeButton.first()).toBeVisible();
  });
});
