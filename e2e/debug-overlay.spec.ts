import { test } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test('screenshot projects page modal state', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'test-results/debug-projects-overlay.png', fullPage: true });

  const overlays = await page.locator('[class*="fixed inset-0 z-50"], [role="dialog"], [data-slot="dialog-content"]').all();
  console.log('Overlay/dialog elements:', overlays.length);
  for (const o of overlays) {
    const visible = await o.isVisible().catch(() => false);
    if (visible) {
      const text = await o.innerText().catch(() => '');
      console.log('VISIBLE DIALOG TEXT:', text.slice(0, 300).replace(/\n/g, ' | '));
    }
  }
});
