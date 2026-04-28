# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projects.spec.ts >> Violations View >> should have filter controls
- Location: e2e/projects.spec.ts:49:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[placeholder*="Search violations"]')
Expected: visible
Error: strict mode violation: locator('input[placeholder*="Search violations"]') resolved to 2 elements:
    1) <input value="" data-slot="input" placeholder="Search violations, projects..." class="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:t…/> aka getByRole('textbox', { name: 'Search violations, projects...' })
    2) <input value="" data-slot="input" placeholder="Search violations..." class="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opa…/> aka getByRole('textbox', { name: 'Search violations...' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[placeholder*="Search violations"]')

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
                    - text: 43m ago
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
                    - text: 43m ago
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
                    - text: 43m ago
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
                    - text: 43m ago
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
                    - text: 43m ago
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
                    - text: 43m ago
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
                    - text: 43m ago
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
                    - text: 43m ago
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
                    - text: 43m ago
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
                    - text: 43m ago
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
  3   | test.describe('Projects View', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/');
  6   |     await page.locator('button:has-text("Start Free Trial")').first().click();
  7   |     await page.waitForTimeout(1500);
  8   |     await page.locator('button:has-text("Projects")').first().click();
  9   |     await page.waitForTimeout(500);
  10  |   });
  11  | 
  12  |   test('should display projects list', async ({ page }) => {
  13  |     await expect(page.locator('text=Projects')).toBeVisible();
  14  |     await expect(page.locator('button:has-text("Add Project")')).toBeVisible();
  15  |   });
  16  | 
  17  |   test('should have export button', async ({ page }) => {
  18  |     await expect(page.locator('button:has-text("Export")')).toBeVisible();
  19  |   });
  20  | 
  21  |   test('should open export dropdown', async ({ page }) => {
  22  |     await page.click('button:has-text("Export")');
  23  |     await expect(page.locator('text=Export as CSV')).toBeVisible();
  24  |     await expect(page.locator('text=Export as Excel')).toBeVisible();
  25  |   });
  26  | 
  27  |   test('should open add project dialog', async ({ page }) => {
  28  |     await page.click('text=Add Project');
  29  |     await page.waitForTimeout(500);
  30  |     
  31  |     // Dialog should open
  32  |     await expect(page.locator('text=Add New Project')).toBeVisible();
  33  |   });
  34  | });
  35  | 
  36  | test.describe('Violations View', () => {
  37  |   test.beforeEach(async ({ page }) => {
  38  |     await page.goto('/');
  39  |     await page.locator('button:has-text("Start Free Trial")').first().click();
  40  |     await page.waitForTimeout(1500);
  41  |     await page.locator('button:has-text("Violations")').click();
  42  |     await page.waitForTimeout(500);
  43  |   });
  44  | 
  45  |   test('should display violations list', async ({ page }) => {
  46  |     await expect(page.locator('text=Violations')).toBeVisible();
  47  |   });
  48  | 
  49  |   test('should have filter controls', async ({ page }) => {
> 50  |     await expect(page.locator('input[placeholder*="Search violations"]')).toBeVisible();
      |                                                                           ^ Error: expect(locator).toBeVisible() failed
  51  |   });
  52  | 
  53  |   test('should have export button', async ({ page }) => {
  54  |     await expect(page.locator('button:has-text("Export")')).toBeVisible();
  55  |   });
  56  | });
  57  | 
  58  | test.describe('Scans View', () => {
  59  |   test.beforeEach(async ({ page }) => {
  60  |     await page.goto('/');
  61  |     await page.locator('button:has-text("Start Free Trial")').first().click();
  62  |     await page.waitForTimeout(1500);
  63  |     await page.locator('button:has-text("Scan History")').click();
  64  |     await page.waitForTimeout(500);
  65  |   });
  66  | 
  67  |   test('should display scans list', async ({ page }) => {
  68  |     await expect(page.locator('text=Scan History')).toBeVisible();
  69  |   });
  70  | });
  71  | 
  72  | test.describe('Reports View', () => {
  73  |   test.beforeEach(async ({ page }) => {
  74  |     await page.goto('/');
  75  |     await page.locator('button:has-text("Start Free Trial")').first().click();
  76  |     await page.waitForTimeout(1500);
  77  |     await page.locator('button:has-text("Reports")').click();
  78  |     await page.waitForTimeout(500);
  79  |   });
  80  | 
  81  |   test('should display reports section', async ({ page }) => {
  82  |     await expect(page.locator('text=Reports')).toBeVisible();
  83  |   });
  84  | });
  85  | 
  86  | test.describe('Settings View', () => {
  87  |   test.beforeEach(async ({ page }) => {
  88  |     await page.goto('/');
  89  |     await page.locator('button:has-text("Start Free Trial")').first().click();
  90  |     await page.waitForTimeout(1500);
  91  |     await page.locator('button:has-text("Settings")').click();
  92  |     await page.waitForTimeout(500);
  93  |   });
  94  | 
  95  |   test('should display settings tabs', async ({ page }) => {
  96  |     await expect(page.locator('text=Profile')).toBeVisible();
  97  |     await expect(page.locator('text=Appearance')).toBeVisible();
  98  |     await expect(page.locator('text=Alerts')).toBeVisible();
  99  |   });
  100 | 
  101 |   test('should display profile settings', async ({ page }) => {
  102 |     await expect(page.locator('text=Profile Information')).toBeVisible();
  103 |   });
  104 | 
  105 |   test('should display appearance settings', async ({ page }) => {
  106 |     await page.locator('button:has-text("Appearance")').click();
  107 |     await page.waitForTimeout(500);
  108 |     
  109 |     // Check for theme section with exact match
  110 |     await expect(page.locator('div:has(> :text("Theme"))')).toBeVisible();
  111 |     await expect(page.locator('button:has-text("Light")')).toBeVisible();
  112 |     await expect(page.locator('button:has-text("Dark")')).toBeVisible();
  113 |     await expect(page.locator('button:has-text("System")')).toBeVisible();
  114 |   });
  115 | 
  116 |   test('should display notification settings', async ({ page }) => {
  117 |     await page.locator('button:has-text("Alerts")').click();
  118 |     await page.waitForTimeout(500);
  119 |     await expect(page.locator('text=Email Notifications')).toBeVisible();
  120 |   });
  121 | });
  122 | 
```