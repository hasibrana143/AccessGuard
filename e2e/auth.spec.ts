import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page with form', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('#email')).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should have link to register page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('text=Sign up')).toBeVisible();
  });

  test('should have back to home button', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('text=Back to Home')).toBeVisible();
  });
});
