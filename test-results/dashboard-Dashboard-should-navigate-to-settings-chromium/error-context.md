# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> should navigate to settings
- Location: e2e/dashboard.spec.ts:58:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Settings')
Expected: visible
Error: strict mode violation: locator('text=Settings') resolved to 3 elements:
    1) <button data-slot="button" class="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs hover:bg-secondary/80 h-9 px-4 py-2 has…>…</button> aka getByRole('button', { name: 'Settings' })
    2) <h1 class="text-2xl font-bold">Settings</h1> aka getByRole('heading', { name: 'Settings' })
    3) <div data-slot="card-description" class="text-muted-foreground text-sm">Manage your organization settings</div> aka getByText('Manage your organization')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Settings')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e7]:
        - img [ref=e8]
        - generic [ref=e10]: AccessGuard
      - navigation [ref=e14]:
        - button "Dashboard" [ref=e15]:
          - img
          - text: Dashboard
        - button "Projects" [ref=e16]:
          - img
          - text: Projects
        - button "Violations" [ref=e17]:
          - img
          - text: Violations
        - button "Scan History" [ref=e18]:
          - img
          - text: Scan History
        - button "Reports" [ref=e19]:
          - img
          - text: Reports
        - button "Settings" [active] [ref=e20]:
          - img
          - text: Settings
      - generic [ref=e22]:
        - generic [ref=e24]: DU
        - generic [ref=e25]:
          - paragraph [ref=e26]: Demo User
          - paragraph [ref=e27]: demo@accessguard.io
        - button [ref=e28]:
          - img
        - button [ref=e29]:
          - img
    - generic [ref=e30]:
      - banner [ref=e31]:
        - generic [ref=e32]:
          - generic [ref=e34]:
            - img [ref=e35]
            - textbox "Search violations, projects..." [ref=e38]
            - generic:
              - generic: ⌘
              - text: K
          - generic [ref=e39]:
            - button [ref=e40]:
              - img
            - button [ref=e41]:
              - img
            - button [ref=e42]:
              - img
      - main [ref=e43]:
        - generic [ref=e45]:
          - generic [ref=e46]:
            - heading "Settings" [level=1] [ref=e47]
            - paragraph [ref=e48]: Manage your account and preferences
          - generic [ref=e49]:
            - tablist [ref=e50]:
              - tab "Profile" [selected] [ref=e51]
              - tab "Appearance" [ref=e52]
              - tab "Alerts" [ref=e53]
              - tab "Billing" [ref=e54]
              - tab "API" [ref=e55]
              - tab "GitHub" [ref=e56]
            - tabpanel "Profile" [ref=e57]:
              - generic [ref=e58]:
                - generic [ref=e59]:
                  - generic [ref=e60]: Profile Information
                  - generic [ref=e61]: Update your account details
                - generic [ref=e62]:
                  - generic [ref=e63]:
                    - generic [ref=e64]: Name
                    - textbox [ref=e65]: Demo User
                  - generic [ref=e66]:
                    - generic [ref=e67]: Email
                    - textbox [ref=e68]: demo@accessguard.io
                  - button "Save Changes" [ref=e69]
              - generic [ref=e70]:
                - generic [ref=e71]:
                  - generic [ref=e72]: Organization
                  - generic [ref=e73]: Manage your organization settings
                - generic [ref=e74]:
                  - generic [ref=e75]:
                    - generic [ref=e76]: Organization Name
                    - textbox [ref=e77]: Demo Organization
                  - generic [ref=e78]:
                    - generic [ref=e79]:
                      - img [ref=e81]
                      - generic [ref=e85]:
                        - paragraph [ref=e86]: Agency Plan
                        - paragraph [ref=e87]: $199/month • 10 websites
                    - button "Upgrade" [ref=e88]
      - contentinfo [ref=e89]:
        - generic [ref=e90]:
          - generic [ref=e91]:
            - img [ref=e92]
            - generic [ref=e94]: AccessGuard © 2024
          - generic [ref=e95]:
            - button "Shortcuts" [ref=e96]:
              - img [ref=e97]
              - generic [ref=e99]: Shortcuts
            - generic [ref=e100]:
              - img
              - text: Lawsuit Defense Ready™
    - region "Notifications (F8)":
      - list
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e106] [cursor=pointer]:
    - img [ref=e107]
  - alert [ref=e110]
  - generic [ref=e111]: "0"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Dashboard', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Navigate to the app and go to dashboard
  6   |     await page.goto('/');
  7   |     await page.locator('button:has-text("Start Free Trial")').first().click();
  8   |     await page.waitForTimeout(1500);
  9   |   });
  10  | 
  11  |   test('should display dashboard with stats', async ({ page }) => {
  12  |     // Check for dashboard stats
  13  |     await expect(page.locator('text=Risk Score')).toBeVisible();
  14  |     await expect(page.locator('text=Violations')).toBeVisible();
  15  |   });
  16  | 
  17  |   test('should display violation chart', async ({ page }) => {
  18  |     // Check for chart section
  19  |     await expect(page.locator('text=Violation Trends')).toBeVisible();
  20  |   });
  21  | 
  22  |   test('should navigate to projects', async ({ page }) => {
  23  |     // Click on Projects in sidebar
  24  |     await page.locator('button:has-text("Projects")').first().click();
  25  |     await page.waitForTimeout(500);
  26  |     
  27  |     // Should see projects content
  28  |     await expect(page.locator('text=Projects')).toBeVisible();
  29  |   });
  30  | 
  31  |   test('should navigate to violations', async ({ page }) => {
  32  |     // Click on Violations in sidebar
  33  |     await page.locator('button:has-text("Violations")').click();
  34  |     await page.waitForTimeout(500);
  35  |     
  36  |     // Should see violations content
  37  |     await expect(page.locator('text=Violations')).toBeVisible();
  38  |   });
  39  | 
  40  |   test('should navigate to scans', async ({ page }) => {
  41  |     // Click on Scan History in sidebar
  42  |     await page.locator('button:has-text("Scan History")').click();
  43  |     await page.waitForTimeout(500);
  44  |     
  45  |     // Should see scans content
  46  |     await expect(page.locator('text=Scan History')).toBeVisible();
  47  |   });
  48  | 
  49  |   test('should navigate to reports', async ({ page }) => {
  50  |     // Click on Reports in sidebar
  51  |     await page.locator('button:has-text("Reports")').click();
  52  |     await page.waitForTimeout(500);
  53  |     
  54  |     // Should see reports content
  55  |     await expect(page.locator('text=Reports')).toBeVisible();
  56  |   });
  57  | 
  58  |   test('should navigate to settings', async ({ page }) => {
  59  |     // Click on Settings in sidebar
  60  |     await page.locator('button:has-text("Settings")').click();
  61  |     await page.waitForTimeout(500);
  62  |     
  63  |     // Should see settings content
> 64  |     await expect(page.locator('text=Settings')).toBeVisible();
      |                                                 ^ Error: expect(locator).toBeVisible() failed
  65  |   });
  66  | });
  67  | 
  68  | test.describe('Sidebar Navigation', () => {
  69  |   test.beforeEach(async ({ page }) => {
  70  |     await page.goto('/');
  71  |     await page.locator('button:has-text("Start Free Trial")').first().click();
  72  |     await page.waitForTimeout(1500);
  73  |   });
  74  | 
  75  |   test('should show user info in sidebar', async ({ page }) => {
  76  |     await expect(page.locator('text=Demo User')).toBeVisible();
  77  |   });
  78  | 
  79  |   test('should show AccessGuard logo', async ({ page }) => {
  80  |     await expect(page.locator('text=AccessGuard')).toBeVisible();
  81  |   });
  82  | });
  83  | 
  84  | test.describe('Header Search', () => {
  85  |   test.beforeEach(async ({ page }) => {
  86  |     await page.goto('/');
  87  |     await page.locator('button:has-text("Start Free Trial")').first().click();
  88  |     await page.waitForTimeout(1500);
  89  |   });
  90  | 
  91  |   test('should have search input', async ({ page }) => {
  92  |     const searchInput = page.locator('input[placeholder*="Search"]');
  93  |     await expect(searchInput).toBeVisible();
  94  |   });
  95  | 
  96  |   test('should filter content when searching', async ({ page }) => {
  97  |     const searchInput = page.locator('input[placeholder*="Search"]');
  98  |     await searchInput.fill('demo');
  99  |     await page.waitForTimeout(500);
  100 |     await expect(searchInput).toHaveValue('demo');
  101 |   });
  102 | });
  103 | 
  104 | test.describe('Theme Toggle', () => {
  105 |   test.beforeEach(async ({ page }) => {
  106 |     await page.goto('/');
  107 |     await page.locator('button:has-text("Start Free Trial")').first().click();
  108 |     await page.waitForTimeout(1500);
  109 |   });
  110 | 
  111 |   test('should have theme toggle button', async ({ page }) => {
  112 |     // Theme toggle should be visible in sidebar
  113 |     const sunOrMoon = page.locator('[class*="lucide-sun"], [class*="lucide-moon"]');
  114 |     await expect(sunOrMoon.first()).toBeVisible();
  115 |   });
  116 | });
  117 | 
```