import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Deep debug: real scan flow', () => {
  test('create project + run scan on example.com + verify violations', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

    const name = `deep-scan-${Date.now()}`;

    await page.goto('/projects');
    await page.waitForTimeout(1000);

    const tour = page.locator('button:has-text("Skip Tour")').first();
    if (await tour.isVisible().catch(() => false)) {
      await tour.click();
      await page.waitForTimeout(800);
    }

    await page.locator('button:has-text("Add Project")').first().click();
    await page.waitForTimeout(500);

    await page.locator('input#name, input[placeholder*="name" i]').first().fill(name);
    await page.locator('input[type="url"], input[placeholder*="URL" i], input[placeholder*="url" i]').first().fill('https://example.com');
    const dialog = page.locator('[role="dialog"], [data-slot="dialog-content"]').last();
    const createBtn = dialog.locator('button:has-text("Add Project"), button:has-text("Create"), button[type="submit"], button:has-text("Start Scan")').first();
    console.log('Dialog create button count:', await dialog.locator('button').count());
    await createBtn.click();

    await page.waitForTimeout(4000);
    console.log('After create, URL:', page.url());

    const projectVisible = await page.locator(`text=${name}`).first().isVisible().catch(() => false);
    console.log('Project visible in list:', projectVisible);

    await page.reload();
    await page.waitForTimeout(2000);

    const row = page.locator(`tr:has-text("${name}")`).first();
    const rowVisible = await row.isVisible().catch(() => false);
    console.log('Project row visible after reload:', rowVisible);

    if (rowVisible) {
      const scanButton = row.locator('button:has-text("Scan"), button:has-text("Run Scan")').first();
      const hasScanBtn = await scanButton.isVisible().catch(() => false);
      console.log('Scan button on row:', hasScanBtn);
      if (hasScanBtn) {
        await scanButton.click();
        await page.waitForTimeout(15000);
        await page.screenshot({ path: 'test-results/deep-scan-after.png', fullPage: true });
        console.log('After scan click, URL:', page.url());
      }
    }

    await page.goto('/scans');
    await page.waitForTimeout(2500);
    const scanRow = await page.locator(`text=${name}`).first().isVisible().catch(() => false);
    console.log('Scan entry in history:', scanRow);

    await page.goto('/violations');
    await page.waitForTimeout(2500);
    const violationCount = await page.locator('tbody tr, [data-testid="violation-row"]').count().catch(() => 0);
    console.log('Violation rows:', violationCount);

    if (errors.length) console.log('Console errors:', errors.slice(0, 5).join(' | '));
  });
});
