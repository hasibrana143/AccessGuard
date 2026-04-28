# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> should display dashboard with stats
- Location: e2e/dashboard.spec.ts:11:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Violations')
Expected: visible
Error: strict mode violation: locator('text=Violations') resolved to 9 elements:
    1) <button data-slot="button" class="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent…>…</button> aka getByRole('button', { name: 'Violations' })
    2) <p class="text-sm text-muted-foreground">Open Violations</p> aka getByText('Open Violations', { exact: true })
    3) <div data-slot="card-description" class="text-muted-foreground text-sm">Current open violations</div> aka getByText('Current open violations')
    4) <div data-slot="card-title" class="font-semibold text-lg">Recent Violations</div> aka getByText('Recent Violations')
    5) <span>34 violations</span> aka getByText('34 violations')
    6) <span>0 violations</span> aka getByText('violations').nth(5)
    7) <span>0 violations</span> aka getByText('0 violations').nth(1)
    8) <span>23 violations</span> aka getByText('23 violations')
    9) <span>12 violations</span> aka getByText('12 violations')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Violations')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
              - heading "Dashboard" [level=1] [ref=e48]
              - paragraph [ref=e49]: Overview of your accessibility compliance
            - generic [ref=e50]:
              - button "Export Report" [ref=e51]:
                - img
                - text: Export Report
              - button "Scan All" [ref=e52]:
                - img
                - text: Scan All
          - generic [ref=e53]:
            - generic [ref=e57]:
              - generic [ref=e58]:
                - paragraph [ref=e59]: Avg Risk Score
                - paragraph [ref=e60]: 52/100
                - generic [ref=e61]: High Risk
              - img [ref=e63]
            - generic [ref=e69]:
              - generic [ref=e70]:
                - paragraph [ref=e71]: Open Violations
                - paragraph [ref=e72]: "72"
                - generic [ref=e73]:
                  - img [ref=e74]
                  - generic [ref=e77]: 12% from last week
              - img [ref=e79]
            - generic [ref=e83]:
              - generic [ref=e84]:
                - paragraph [ref=e85]: Critical Issues
                - paragraph [ref=e86]: "12"
                - generic [ref=e87]:
                  - img [ref=e88]
                  - generic [ref=e90]: Requires immediate attention
              - img [ref=e92]
            - generic [ref=e96]:
              - generic [ref=e97]:
                - paragraph [ref=e98]: Projects
                - paragraph [ref=e99]: "3"
                - generic [ref=e100]:
                  - img [ref=e101]
                  - generic [ref=e104]: Active monitoring
              - img [ref=e106]
          - generic [ref=e109]:
            - generic [ref=e110]:
              - generic [ref=e112]:
                - generic [ref=e113]:
                  - generic [ref=e114]: Violation Trends
                  - generic [ref=e115]: 30-day violation history
                - combobox [ref=e116]:
                  - generic: 30 days
                  - img
              - generic [ref=e117]:
                - img [ref=e121]:
                  - generic [ref=e126]:
                    - generic [ref=e128]: Mar 30
                    - generic [ref=e130]: Apr 2
                    - generic [ref=e132]: Apr 5
                    - generic [ref=e134]: Apr 8
                    - generic [ref=e136]: Apr 11
                    - generic [ref=e138]: Apr 14
                    - generic [ref=e140]: Apr 17
                    - generic [ref=e142]: Apr 20
                    - generic [ref=e144]: Apr 23
                    - generic [ref=e146]: Apr 27
                  - generic [ref=e148]:
                    - generic [ref=e150]: "0"
                    - generic [ref=e152]: "15"
                    - generic [ref=e154]: "30"
                    - generic [ref=e156]: "45"
                    - generic [ref=e158]: "60"
                - generic [ref=e165]:
                  - generic [ref=e168]: Total
                  - generic [ref=e171]: Critical
                  - generic [ref=e174]: Serious
            - generic [ref=e175]:
              - generic [ref=e176]:
                - generic [ref=e177]: Severity Distribution
                - generic [ref=e178]: Current open violations
              - generic [ref=e179]:
                - img [ref=e183]:
                  - generic [ref=e185]:
                    - img [ref=e187]
                    - img [ref=e189]
                    - img [ref=e191]
                    - img [ref=e193]
                - generic [ref=e194]:
                  - generic [ref=e197]:
                    - generic [ref=e198]: Critical
                    - generic [ref=e199]: "12"
                  - generic [ref=e202]:
                    - generic [ref=e203]: Serious
                    - generic [ref=e204]: "44"
                  - generic [ref=e207]:
                    - generic [ref=e208]: Moderate
                    - generic [ref=e209]: "10"
                  - generic [ref=e212]:
                    - generic [ref=e213]: Minor
                    - generic [ref=e214]: "6"
          - generic [ref=e215]:
            - generic [ref=e216]:
              - generic [ref=e218]:
                - generic [ref=e219]:
                  - generic [ref=e220]: Recent Violations
                  - generic [ref=e221]: Latest detected issues
                - button "View All" [ref=e222]:
                  - text: View All
                  - img
              - generic [ref=e224]:
                - generic [ref=e225] [cursor=pointer]:
                  - img [ref=e227]
                  - generic [ref=e229]:
                    - generic [ref=e230]:
                      - generic [ref=e231]: Color Contrast
                      - generic [ref=e232]: serious
                    - paragraph [ref=e233]: Elements must meet minimum color contrast ratio thresholds
                    - generic [ref=e234]:
                      - img [ref=e235]
                      - generic [ref=e238]: https://testwebsite.com
                  - button "View" [ref=e239]
                - generic [ref=e240] [cursor=pointer]:
                  - img [ref=e242]
                  - generic [ref=e244]:
                    - generic [ref=e245]:
                      - generic [ref=e246]: Color Contrast
                      - generic [ref=e247]: serious
                    - paragraph [ref=e248]: Elements must meet minimum color contrast ratio thresholds
                    - generic [ref=e249]:
                      - img [ref=e250]
                      - generic [ref=e253]: https://testwebsite.com
                  - button "View" [ref=e254]
                - generic [ref=e255] [cursor=pointer]:
                  - img [ref=e257]
                  - generic [ref=e259]:
                    - generic [ref=e260]:
                      - generic [ref=e261]: Color Contrast
                      - generic [ref=e262]: serious
                    - paragraph [ref=e263]: Elements must meet minimum color contrast ratio thresholds
                    - generic [ref=e264]:
                      - img [ref=e265]
                      - generic [ref=e268]: https://testwebsite.com
                  - button "View" [ref=e269]
                - generic [ref=e270] [cursor=pointer]:
                  - img [ref=e272]
                  - generic [ref=e274]:
                    - generic [ref=e275]:
                      - generic [ref=e276]: Color Contrast
                      - generic [ref=e277]: serious
                    - paragraph [ref=e278]: Elements must meet minimum color contrast ratio thresholds
                    - generic [ref=e279]:
                      - img [ref=e280]
                      - generic [ref=e283]: https://testwebsite.com
                  - button "View" [ref=e284]
                - generic [ref=e285] [cursor=pointer]:
                  - img [ref=e287]
                  - generic [ref=e289]:
                    - generic [ref=e290]:
                      - generic [ref=e291]: Color Contrast
                      - generic [ref=e292]: serious
                    - paragraph [ref=e293]: Elements must meet minimum color contrast ratio thresholds
                    - generic [ref=e294]:
                      - img [ref=e295]
                      - generic [ref=e298]: https://testwebsite.com
                  - button "View" [ref=e299]
            - generic [ref=e300]:
              - generic [ref=e302]:
                - generic [ref=e303]:
                  - generic [ref=e304]: Recent Scans
                  - generic [ref=e305]: Latest scan activity
                - button "View All" [ref=e306]:
                  - text: View All
                  - img
              - generic [ref=e308]:
                - generic [ref=e309]:
                  - img [ref=e311]
                  - generic [ref=e314]:
                    - generic [ref=e315]:
                      - generic [ref=e316]: Test Website
                      - generic [ref=e317]: completed
                    - generic [ref=e318]:
                      - generic [ref=e319]: 1 pages
                      - generic [ref=e320]: 34 violations
                      - generic [ref=e321]: 42m ago
                - generic [ref=e322]:
                  - img [ref=e324]
                  - generic [ref=e327]:
                    - generic [ref=e328]:
                      - generic [ref=e329]: Test Website
                      - generic [ref=e330]: pending
                    - generic [ref=e331]:
                      - generic [ref=e332]: 0 pages
                      - generic [ref=e333]: 0 violations
                      - generic [ref=e334]: 45m ago
                - generic [ref=e335]:
                  - img [ref=e337]
                  - generic [ref=e339]:
                    - generic [ref=e340]:
                      - generic [ref=e341]: E-Commerce Store
                      - generic [ref=e342]: running
                    - generic [ref=e343]:
                      - generic [ref=e344]: 12 pages
                      - generic [ref=e345]: 0 violations
                      - generic [ref=e346]: 6d ago
                - generic [ref=e347]:
                  - img [ref=e349]
                  - generic [ref=e352]:
                    - generic [ref=e353]:
                      - generic [ref=e354]: E-Commerce Store
                      - generic [ref=e355]: completed
                    - generic [ref=e356]:
                      - generic [ref=e357]: 48 pages
                      - generic [ref=e358]: 23 violations
                      - generic [ref=e359]: 6d ago
                - generic [ref=e360]:
                  - img [ref=e362]
                  - generic [ref=e365]:
                    - generic [ref=e366]:
                      - generic [ref=e367]: Marketing Website
                      - generic [ref=e368]: completed
                    - generic [ref=e369]:
                      - generic [ref=e370]: 35 pages
                      - generic [ref=e371]: 12 violations
                      - generic [ref=e372]: 6d ago
      - contentinfo [ref=e373]:
        - generic [ref=e374]:
          - generic [ref=e375]:
            - img [ref=e376]
            - generic [ref=e378]: AccessGuard © 2024
          - generic [ref=e379]:
            - button "Shortcuts" [ref=e380]:
              - img [ref=e381]
              - generic [ref=e383]: Shortcuts
            - generic [ref=e384]:
              - img
              - text: Lawsuit Defense Ready™
    - region "Notifications (F8)":
      - list
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e390] [cursor=pointer]:
    - img [ref=e391]
  - alert [ref=e394]
  - generic [ref=e395]: "0"
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
> 14  |     await expect(page.locator('text=Violations')).toBeVisible();
      |                                                   ^ Error: expect(locator).toBeVisible() failed
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
```