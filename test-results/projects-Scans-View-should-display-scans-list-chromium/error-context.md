# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projects.spec.ts >> Scans View >> should display scans list
- Location: e2e/projects.spec.ts:67:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Scan History')
Expected: visible
Error: strict mode violation: locator('text=Scan History') resolved to 3 elements:
    1) <button data-slot="button" class="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs hover:bg-secondary/80 h-9 px-4 py-2 has…>…</button> aka getByRole('button', { name: 'Scan History' })
    2) <h1 class="text-2xl font-bold">Scan History</h1> aka getByRole('heading', { name: 'Scan History' })
    3) <p class="text-muted-foreground">View all accessibility scan history</p> aka getByText('View all accessibility scan')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Scan History')

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
        - button "Scan History" [active] [ref=e18]:
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
          - generic [ref=e47]:
            - heading "Scan History" [level=1] [ref=e48]
            - paragraph [ref=e49]: View all accessibility scan history
          - generic [ref=e52]:
            - generic [ref=e53]:
              - img [ref=e55]
              - generic [ref=e58]:
                - generic [ref=e59]:
                  - generic [ref=e60]: Test Website
                  - generic [ref=e61]: completed
                - generic [ref=e62]:
                  - generic [ref=e63]: 1 pages scanned
                  - generic [ref=e64]: 34 violations found
                  - generic [ref=e65]: 43m ago
              - generic [ref=e67]: 34 serious
              - button [ref=e68]:
                - img
            - generic [ref=e69]:
              - img [ref=e71]
              - generic [ref=e74]:
                - generic [ref=e75]:
                  - generic [ref=e76]: Test Website
                  - generic [ref=e77]: pending
                - generic [ref=e78]:
                  - generic [ref=e79]: 0 pages scanned
                  - generic [ref=e80]: 0 violations found
                  - generic [ref=e81]: 46m ago
              - button [ref=e82]:
                - img
            - generic [ref=e83]:
              - img [ref=e85]
              - generic [ref=e87]:
                - generic [ref=e88]:
                  - generic [ref=e89]: E-Commerce Store
                  - generic [ref=e90]: running
                - generic [ref=e91]:
                  - generic [ref=e92]: 12 pages scanned
                  - generic [ref=e93]: 0 violations found
                  - generic [ref=e94]: 6d ago
              - button [ref=e95]:
                - img
            - generic [ref=e96]:
              - img [ref=e98]
              - generic [ref=e101]:
                - generic [ref=e102]:
                  - generic [ref=e103]: E-Commerce Store
                  - generic [ref=e104]: completed
                - generic [ref=e105]:
                  - generic [ref=e106]: 48 pages scanned
                  - generic [ref=e107]: 23 violations found
                  - generic [ref=e108]: 6d ago
              - generic [ref=e109]:
                - generic [ref=e110]: 5 critical
                - generic [ref=e111]: 8 serious
              - button [ref=e112]:
                - img
            - generic [ref=e113]:
              - img [ref=e115]
              - generic [ref=e118]:
                - generic [ref=e119]:
                  - generic [ref=e120]: Marketing Website
                  - generic [ref=e121]: completed
                - generic [ref=e122]:
                  - generic [ref=e123]: 35 pages scanned
                  - generic [ref=e124]: 12 violations found
                  - generic [ref=e125]: 6d ago
              - generic [ref=e126]:
                - generic [ref=e127]: 2 critical
                - generic [ref=e128]: 4 serious
              - button [ref=e129]:
                - img
      - contentinfo [ref=e130]:
        - generic [ref=e131]:
          - generic [ref=e132]:
            - img [ref=e133]
            - generic [ref=e135]: AccessGuard © 2024
          - generic [ref=e136]:
            - button "Shortcuts" [ref=e137]:
              - img [ref=e138]
              - generic [ref=e140]: Shortcuts
            - generic [ref=e141]:
              - img
              - text: Lawsuit Defense Ready™
    - region "Notifications (F8)":
      - list
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e147] [cursor=pointer]:
    - img [ref=e148]
  - alert [ref=e151]
  - generic [ref=e152]: "0"
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
  50  |     await expect(page.locator('input[placeholder*="Search violations"]')).toBeVisible();
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
> 68  |     await expect(page.locator('text=Scan History')).toBeVisible();
      |                                                     ^ Error: expect(locator).toBeVisible() failed
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