# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> should navigate to projects
- Location: e2e/dashboard.spec.ts:22:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Projects')
Expected: visible
Error: strict mode violation: locator('text=Projects') resolved to 2 elements:
    1) <button data-slot="button" class="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs hover:bg-secondary/80 h-9 px-4 py-2 has…>…</button> aka getByRole('button', { name: 'Projects' })
    2) <h1 class="text-2xl font-bold">Projects</h1> aka getByRole('heading', { name: 'Projects' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Projects')

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
        - button "Projects" [active] [ref=e16]:
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
        - button "Settings" [ref=e20]:
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
            - generic [ref=e47]:
              - heading "Projects" [level=1] [ref=e48]
              - paragraph [ref=e49]: Manage your monitored websites
            - generic [ref=e50]:
              - button "Export" [ref=e51]:
                - img
                - text: Export
                - img
              - button "Add Project" [ref=e52]:
                - img
                - text: Add Project
          - generic [ref=e53]:
            - generic [ref=e54]:
              - generic [ref=e56]:
                - generic [ref=e57]:
                  - generic [ref=e58]: Test Website0
                  - generic [ref=e59]:
                    - img [ref=e60]
                    - link "testwebsite.com" [ref=e63] [cursor=pointer]:
                      - /url: https://testwebsite.com
                - button [ref=e64]:
                  - img
              - generic [ref=e65]:
                - generic [ref=e66]:
                  - generic [ref=e67]:
                    - generic [ref=e68]: Risk Score
                    - generic [ref=e69]: 0/100
                  - progressbar [ref=e70]
                - generic [ref=e72]:
                  - generic [ref=e73]:
                    - generic [ref=e74]: "0"
                    - generic [ref=e75]: Crit
                  - generic [ref=e76]:
                    - generic [ref=e77]: "34"
                    - generic [ref=e78]: Ser
                  - generic [ref=e79]:
                    - generic [ref=e80]: "0"
                    - generic [ref=e81]: Mod
                  - generic [ref=e82]:
                    - generic [ref=e83]: "0"
                    - generic [ref=e84]: Min
                - generic [ref=e85]:
                  - generic [ref=e86]:
                    - img [ref=e87]
                    - text: 42m ago
                  - generic [ref=e90]: completed
              - button "Scan Now" [ref=e92]:
                - img
                - text: Scan Now
            - generic [ref=e93]:
              - generic [ref=e95]:
                - generic [ref=e96]:
                  - generic [ref=e97]: Marketing Website
                  - generic [ref=e98]:
                    - img [ref=e99]
                    - link "marketing.example.com" [ref=e102] [cursor=pointer]:
                      - /url: https://marketing.example.com
                - button [ref=e103]:
                  - img
              - generic [ref=e104]:
                - generic [ref=e105]:
                  - generic [ref=e106]:
                    - generic [ref=e107]: Risk Score
                    - generic [ref=e108]: 85/100
                  - progressbar [ref=e109]
                - generic [ref=e111]:
                  - generic [ref=e112]:
                    - generic [ref=e113]: "4"
                    - generic [ref=e114]: Crit
                  - generic [ref=e115]:
                    - generic [ref=e116]: "2"
                    - generic [ref=e117]: Ser
                  - generic [ref=e118]:
                    - generic [ref=e119]: "4"
                    - generic [ref=e120]: Mod
                  - generic [ref=e121]:
                    - generic [ref=e122]: "3"
                    - generic [ref=e123]: Min
                - generic [ref=e124]:
                  - generic [ref=e125]:
                    - img [ref=e126]
                    - text: 6d ago
                  - generic [ref=e129]: completed
              - button "Scan Now" [ref=e131]:
                - img
                - text: Scan Now
            - generic [ref=e132]:
              - generic [ref=e134]:
                - generic [ref=e135]:
                  - generic [ref=e136]: E-Commerce Store
                  - generic [ref=e137]:
                    - img [ref=e138]
                    - link "shop.example.com" [ref=e141] [cursor=pointer]:
                      - /url: https://shop.example.com
                - button [ref=e142]:
                  - img
              - generic [ref=e143]:
                - generic [ref=e144]:
                  - generic [ref=e145]:
                    - generic [ref=e146]: Risk Score
                    - generic [ref=e147]: 72/100
                  - progressbar [ref=e148]
                - generic [ref=e150]:
                  - generic [ref=e151]:
                    - generic [ref=e152]: "8"
                    - generic [ref=e153]: Crit
                  - generic [ref=e154]:
                    - generic [ref=e155]: "8"
                    - generic [ref=e156]: Ser
                  - generic [ref=e157]:
                    - generic [ref=e158]: "6"
                    - generic [ref=e159]: Mod
                  - generic [ref=e160]:
                    - generic [ref=e161]: "3"
                    - generic [ref=e162]: Min
                - generic [ref=e163]:
                  - generic [ref=e164]:
                    - img [ref=e165]
                    - text: 6d ago
                  - generic [ref=e168]: running
              - button "Scan Now" [ref=e170]:
                - img
                - text: Scan Now
      - contentinfo [ref=e171]:
        - generic [ref=e172]:
          - generic [ref=e173]:
            - img [ref=e174]
            - generic [ref=e176]: AccessGuard © 2024
          - generic [ref=e177]:
            - button "Shortcuts" [ref=e178]:
              - img [ref=e179]
              - generic [ref=e181]: Shortcuts
            - generic [ref=e182]:
              - img
              - text: Lawsuit Defense Ready™
    - region "Notifications (F8)":
      - list
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e188] [cursor=pointer]:
    - img [ref=e189]
  - alert [ref=e192]
  - generic [ref=e193]: "0"
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
> 28  |     await expect(page.locator('text=Projects')).toBeVisible();
      |                                                 ^ Error: expect(locator).toBeVisible() failed
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
  64  |     await expect(page.locator('text=Settings')).toBeVisible();
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