# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: projects.spec.ts >> Settings View >> should display settings tabs
- Location: e2e/projects.spec.ts:95:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Profile')
Expected: visible
Error: strict mode violation: locator('text=Profile') resolved to 2 elements:
    1) <button role="tab" type="button" tabindex="-1" data-state="active" aria-selected="true" data-slot="tabs-trigger" data-orientation="horizontal" data-radix-collection-item="" id="radix-_r_h_-trigger-profile" aria-controls="radix-_r_h_-content-profile" class="data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dar…>Profile</button> aka getByRole('tab', { name: 'Profile' })
    2) <div data-slot="card-title" class="leading-none font-semibold">Profile Information</div> aka getByText('Profile Information')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Profile')

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
> 96  |     await expect(page.locator('text=Profile')).toBeVisible();
      |                                                ^ Error: expect(locator).toBeVisible() failed
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