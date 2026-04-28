import { test, expect } from '@playwright/test';

test.describe('Projects View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
    await page.locator('nav button:has-text("Projects")').click();
    await page.waitForTimeout(800);
  });

  test('should display projects list', async ({ page }) => {
    await expect(page.locator('h1:has-text("Projects")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Project")')).toBeVisible();
  });

  test('should have export button', async ({ page }) => {
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('should open export dropdown', async ({ page }) => {
    await page.click('button:has-text("Export")');
    await expect(page.locator('text=Export as CSV')).toBeVisible();
    await expect(page.locator('text=Export as Excel')).toBeVisible();
  });

  test('should open add project dialog', async ({ page }) => {
    await page.click('button:has-text("Add Project")');
    await page.waitForTimeout(500);
    
    // Dialog should open
    await expect(page.locator('text=Add New Project')).toBeVisible();
  });
});

test.describe('Violations View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
    await page.locator('nav button:has-text("Violations")').click();
    await page.waitForTimeout(800);
  });

  test('should display violations list', async ({ page }) => {
    await expect(page.locator('h1:has-text("Violations")')).toBeVisible();
  });

  test('should have filter controls', async ({ page }) => {
    // Use more specific selector for violations search input
    const searchInput = page.locator('input[placeholder*="Search violations"]');
    await expect(searchInput.first()).toBeVisible();
  });

  test('should have export button', async ({ page }) => {
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });
});

test.describe('Scans View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
    await page.locator('nav button:has-text("Scan History")').click();
    await page.waitForTimeout(800);
  });

  test('should display scans list', async ({ page }) => {
    await expect(page.locator('h1:has-text("Scan History")')).toBeVisible();
  });
});

test.describe('Reports View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
    await page.locator('nav button:has-text("Reports")').click();
    await page.waitForTimeout(800);
  });

  test('should display reports section', async ({ page }) => {
    await expect(page.locator('h1:has-text("Reports")')).toBeVisible();
  });
});

test.describe('Settings View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const heroButton = page.locator('button:has-text("Start Free Trial")').filter({ has: page.locator('svg') }).first();
    await heroButton.scrollIntoViewIfNeeded();
    await heroButton.click({ force: true });
    await page.waitForTimeout(1500);
    await page.locator('nav button:has-text("Settings")').click();
    await page.waitForTimeout(800);
  });

  test('should display settings tabs', async ({ page }) => {
    // Check for tab buttons (not text which appears in multiple places)
    await expect(page.locator('button[role="tab"]:has-text("Profile")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Appearance")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Alerts")')).toBeVisible();
  });

  test('should display profile settings', async ({ page }) => {
    await expect(page.locator('text=Profile Information')).toBeVisible();
  });

  test('should display appearance settings', async ({ page }) => {
    await page.locator('button[role="tab"]:has-text("Appearance")').click();
    await page.waitForTimeout(500);
    
    // Check for theme buttons
    await expect(page.locator('button:has-text("Light")')).toBeVisible();
    await expect(page.locator('button:has-text("Dark")')).toBeVisible();
    await expect(page.locator('button:has-text("System")')).toBeVisible();
  });

  test('should display notification settings', async ({ page }) => {
    await page.locator('button[role="tab"]:has-text("Alerts")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Email Notifications')).toBeVisible();
  });
});
