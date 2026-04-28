# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projects.spec.ts >> Projects View >> should display projects list
- Location: e2e/projects.spec.ts:12:7

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
                    - text: 43m ago
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
> 13  |     await expect(page.locator('text=Projects')).toBeVisible();
      |                                                 ^ Error: expect(locator).toBeVisible() failed
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
```