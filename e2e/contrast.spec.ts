import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Pixel-contrast audit (V11 deferral): the existing axe suite ran entirely in
// the default dark theme — light mode color pairs were never verified. This
// spec runs the WCAG AA `color-contrast` rule against every key route in BOTH
// themes, so a token change that breaks contrast fails CI instead of rotting.

const UNAUTHED_ROUTES: Array<[string, string]> = [
  ['landing', '/'],
  ['pricing', '/pricing'],
  ['login', '/auth/login'],
  ['register', '/auth/register'],
  ['status', '/status'],
];

const AUTHED_ROUTES: Array<[string, string]> = [
  ['dashboard', '/dashboard'],
  ['projects', '/projects'],
  ['violations', '/violations'],
  ['scans', '/scans'],
  ['reports', '/reports'],
  ['settings', '/settings'],
  ['team', '/team'],
  ['audit-logs', '/audit-logs'],
];

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
}

async function expectNoContrastViolations(page: Page, label: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  // React hydration + data-fetch re-renders can briefly surface placeholder
  // elements (loading buttons, skeletons) that axe would flag. Settle beat
  // matches the standard axe-playwright guidance after client mount.
  await page.waitForTimeout(1500);
  const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  const failures = results.violations.flatMap((v) =>
    v.nodes.map((n) => `${n.target.join(' ')} -> ${n.failureSummary?.replace(/\s+/g, ' ').slice(0, 220)}`)
  );
  expect(failures, `${label} color-contrast failures:\n${failures.join('\n')}`).toEqual([]);
}

async function assertThemeApplied(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.waitForFunction((t) => document.documentElement.classList.contains(t), theme);
}

function addContrastTests(routes: Array<[string, string]>, theme: 'light' | 'dark', authed: boolean): void {
  const describe = test.describe;
  describe(`${theme} mode — ${authed ? 'authenticated' : 'public'} routes`, () => {
    if (!authed) {
      test.use({ storageState: { cookies: [], origins: [] } });
    }
    for (const [name, path] of routes) {
      test(`${name} has WCAG AA color contrast (${theme})`, async ({ page }) => {
        // framer-motion fades render mid-opacity; axe blends those colors and
        // reports false contrast failures. Reduced motion freezes final state.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await setTheme(page, theme);
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await assertThemeApplied(page, theme);
        await expectNoContrastViolations(page, `${path} (${theme})`);
      });
    }
  });
}

for (const theme of ['light', 'dark'] as const) {
  addContrastTests(UNAUTHED_ROUTES, theme, false);
  addContrastTests(AUTHED_ROUTES, theme, true);
}
