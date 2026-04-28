# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> should navigate to violations
- Location: e2e/dashboard.spec.ts:31:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Violations')
Expected: visible
Error: strict mode violation: locator('text=Violations') resolved to 3 elements:
    1) <button data-slot="button" class="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs hover:bg-secondary/80 h-9 px-4 py-2 has…>…</button> aka getByRole('button', { name: 'Violations' })
    2) <h1 class="text-2xl font-bold">Violations</h1> aka getByRole('heading', { name: 'Violations' })
    3) <span data-slot="badge" class="inline-flex items-center justify-center rounded-md border text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 p…>72 violations</span> aka getByText('72 violations')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Violations')

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
        - button "Violations" [active] [ref=e17]:
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
              - heading "Violations" [level=1] [ref=e48]
              - paragraph [ref=e49]: Review and remediate accessibility issues
            - generic [ref=e50]:
              - button "Export" [ref=e51]:
                - img
                - text: Export
                - img
              - button "Create Fix PRs" [ref=e52]:
                - img
                - text: Create Fix PRs
          - generic [ref=e55]:
            - generic [ref=e56]:
              - img [ref=e57]
              - textbox "Search violations..." [ref=e60]
            - combobox [ref=e61]:
              - generic: All Severities
              - img
            - combobox [ref=e62]:
              - generic: Open
              - img
            - generic [ref=e63]: 72 violations
          - generic [ref=e64]:
            - generic [ref=e67] [cursor=pointer]:
              - img [ref=e69]
              - generic [ref=e71]:
                - generic [ref=e72]:
                  - generic [ref=e73]: Color Contrast
                  - generic [ref=e74]: serious
                  - generic [ref=e75]: WCAG 2.a.a
                  - generic [ref=e76]: open
                - paragraph [ref=e77]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e78]:
                  - generic [ref=e79]:
                    - img [ref=e80]
                    - generic [ref=e83]: https://testwebsite.com
                  - generic [ref=e84]:
                    - img [ref=e85]
                    - generic [ref=e88]: a[href$="lifetravel.com"]
                  - generic [ref=e89]:
                    - img [ref=e90]
                    - text: 42m ago
              - generic [ref=e93]:
                - generic [ref=e94]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e95]
            - generic [ref=e98] [cursor=pointer]:
              - img [ref=e100]
              - generic [ref=e102]:
                - generic [ref=e103]:
                  - generic [ref=e104]: Color Contrast
                  - generic [ref=e105]: serious
                  - generic [ref=e106]: WCAG 2.a.a
                  - generic [ref=e107]: open
                - paragraph [ref=e108]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e109]:
                  - generic [ref=e110]:
                    - img [ref=e111]
                    - generic [ref=e114]: https://testwebsite.com
                  - generic [ref=e115]:
                    - img [ref=e116]
                    - generic [ref=e119]: a[href$="localfood.com"]
                  - generic [ref=e120]:
                    - img [ref=e121]
                    - text: 42m ago
              - generic [ref=e124]:
                - generic [ref=e125]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e126]
            - generic [ref=e129] [cursor=pointer]:
              - img [ref=e131]
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]: Color Contrast
                  - generic [ref=e136]: serious
                  - generic [ref=e137]: WCAG 2.a.a
                  - generic [ref=e138]: open
                - paragraph [ref=e139]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e140]:
                  - generic [ref=e141]:
                    - img [ref=e142]
                    - generic [ref=e145]: https://testwebsite.com
                  - generic [ref=e146]:
                    - img [ref=e147]
                    - generic [ref=e150]: .hc-nl-intro
                  - generic [ref=e151]:
                    - img [ref=e152]
                    - text: 42m ago
              - generic [ref=e155]:
                - generic [ref=e156]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e157]
            - generic [ref=e160] [cursor=pointer]:
              - img [ref=e162]
              - generic [ref=e164]:
                - generic [ref=e165]:
                  - generic [ref=e166]: Color Contrast
                  - generic [ref=e167]: serious
                  - generic [ref=e168]: WCAG 2.a.a
                  - generic [ref=e169]: open
                - paragraph [ref=e170]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e171]:
                  - generic [ref=e172]:
                    - img [ref=e173]
                    - generic [ref=e176]: https://testwebsite.com
                  - generic [ref=e177]:
                    - img [ref=e178]
                    - generic [ref=e181]: .hc-disclaimer
                  - generic [ref=e182]:
                    - img [ref=e183]
                    - text: 42m ago
              - generic [ref=e186]:
                - generic [ref=e187]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e188]
            - generic [ref=e191] [cursor=pointer]:
              - img [ref=e193]
              - generic [ref=e195]:
                - generic [ref=e196]:
                  - generic [ref=e197]: Color Contrast
                  - generic [ref=e198]: serious
                  - generic [ref=e199]: WCAG 2.a.a
                  - generic [ref=e200]: open
                - paragraph [ref=e201]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e202]:
                  - generic [ref=e203]:
                    - img [ref=e204]
                    - generic [ref=e207]: https://testwebsite.com
                  - generic [ref=e208]:
                    - img [ref=e209]
                    - generic [ref=e212]: a[href$="gardening.com"]
                  - generic [ref=e213]:
                    - img [ref=e214]
                    - text: 42m ago
              - generic [ref=e217]:
                - generic [ref=e218]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e219]
            - generic [ref=e222] [cursor=pointer]:
              - img [ref=e224]
              - generic [ref=e226]:
                - generic [ref=e227]:
                  - generic [ref=e228]: Color Contrast
                  - generic [ref=e229]: serious
                  - generic [ref=e230]: WCAG 2.a.a
                  - generic [ref=e231]: open
                - paragraph [ref=e232]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e233]:
                  - generic [ref=e234]:
                    - img [ref=e235]
                    - generic [ref=e238]: https://testwebsite.com
                  - generic [ref=e239]:
                    - img [ref=e240]
                    - generic [ref=e243]: a[href$="piante.com"]
                  - generic [ref=e244]:
                    - img [ref=e245]
                    - text: 42m ago
              - generic [ref=e248]:
                - generic [ref=e249]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e250]
            - generic [ref=e253] [cursor=pointer]:
              - img [ref=e255]
              - generic [ref=e257]:
                - generic [ref=e258]:
                  - generic [ref=e259]: Color Contrast
                  - generic [ref=e260]: serious
                  - generic [ref=e261]: WCAG 2.a.a
                  - generic [ref=e262]: open
                - paragraph [ref=e263]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e264]:
                  - generic [ref=e265]:
                    - img [ref=e266]
                    - generic [ref=e269]: https://testwebsite.com
                  - generic [ref=e270]:
                    - img [ref=e271]
                    - generic [ref=e274]: a[href$="calcio.it"]
                  - generic [ref=e275]:
                    - img [ref=e276]
                    - text: 42m ago
              - generic [ref=e279]:
                - generic [ref=e280]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e281]
            - generic [ref=e284] [cursor=pointer]:
              - img [ref=e286]
              - generic [ref=e288]:
                - generic [ref=e289]:
                  - generic [ref=e290]: Color Contrast
                  - generic [ref=e291]: serious
                  - generic [ref=e292]: WCAG 2.a.a
                  - generic [ref=e293]: open
                - paragraph [ref=e294]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e295]:
                  - generic [ref=e296]:
                    - img [ref=e297]
                    - generic [ref=e300]: https://testwebsite.com
                  - generic [ref=e301]:
                    - img [ref=e302]
                    - generic [ref=e305]: a[href$="pronostici.com"]
                  - generic [ref=e306]:
                    - img [ref=e307]
                    - text: 42m ago
              - generic [ref=e310]:
                - generic [ref=e311]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e312]
            - generic [ref=e315] [cursor=pointer]:
              - img [ref=e317]
              - generic [ref=e319]:
                - generic [ref=e320]:
                  - generic [ref=e321]: Color Contrast
                  - generic [ref=e322]: serious
                  - generic [ref=e323]: WCAG 2.a.a
                  - generic [ref=e324]: open
                - paragraph [ref=e325]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e326]:
                  - generic [ref=e327]:
                    - img [ref=e328]
                    - generic [ref=e331]: https://testwebsite.com
                  - generic [ref=e332]:
                    - img [ref=e333]
                    - generic [ref=e336]: a[href$="pronostic.com"]
                  - generic [ref=e337]:
                    - img [ref=e338]
                    - text: 42m ago
              - generic [ref=e341]:
                - generic [ref=e342]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e343]
            - generic [ref=e346] [cursor=pointer]:
              - img [ref=e348]
              - generic [ref=e350]:
                - generic [ref=e351]:
                  - generic [ref=e352]: Color Contrast
                  - generic [ref=e353]: serious
                  - generic [ref=e354]: WCAG 2.a.a
                  - generic [ref=e355]: open
                - paragraph [ref=e356]: Elements must meet minimum color contrast ratio thresholds
                - generic [ref=e357]:
                  - generic [ref=e358]:
                    - img [ref=e359]
                    - generic [ref=e362]: https://testwebsite.com
                  - generic [ref=e363]:
                    - img [ref=e364]
                    - generic [ref=e367]: a[href$="venezia.com"]
                  - generic [ref=e368]:
                    - img [ref=e369]
                    - text: 42m ago
              - generic [ref=e372]:
                - generic [ref=e373]:
                  - img
                  - text: 92%
                - button "View Fix" [ref=e374]
          - generic [ref=e376]:
            - paragraph [ref=e377]: Showing 1 to 10 of 72 results
            - generic [ref=e378]:
              - button "Previous" [disabled]:
                - img
                - text: Previous
              - generic [ref=e379]:
                - button "1" [ref=e380]
                - button "2" [ref=e381]
                - button "3" [ref=e382]
                - button "4" [ref=e383]
                - button "5" [ref=e384]
              - button "Next" [ref=e385]:
                - text: Next
                - img
      - contentinfo [ref=e386]:
        - generic [ref=e387]:
          - generic [ref=e388]:
            - img [ref=e389]
            - generic [ref=e391]: AccessGuard © 2024
          - generic [ref=e392]:
            - button "Shortcuts" [ref=e393]:
              - img [ref=e394]
              - generic [ref=e396]: Shortcuts
            - generic [ref=e397]:
              - img
              - text: Lawsuit Defense Ready™
    - region "Notifications (F8)":
      - list
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e403] [cursor=pointer]:
    - img [ref=e404]
  - alert [ref=e407]
  - generic [ref=e408]: "0"
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
> 37  |     await expect(page.locator('text=Violations')).toBeVisible();
      |                                                   ^ Error: expect(locator).toBeVisible() failed
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