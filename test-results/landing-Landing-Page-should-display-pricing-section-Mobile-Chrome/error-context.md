# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Landing Page >> should display pricing section
- Location: e2e/landing.spec.ts:33:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Agency')
Expected: visible
Error: strict mode violation: locator('text=Agency') resolved to 3 elements:
    1) <div class="text-xl font-bold text-muted-foreground">AgencyPro</div> aka getByText('AgencyPro')
    2) <div data-slot="card-title" class="font-semibold text-lg">Agency White-Label</div> aka getByText('Agency White-Label')
    3) <div data-slot="card-title" class="font-semibold text-xl">Agency</div> aka getByText('Agency', { exact: true })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Agency')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - img [ref=e7]
          - generic [ref=e9]: AccessGuard
          - generic [ref=e10]: Lawsuit Defense Ready™
        - generic [ref=e11]:
          - button "Sign In" [ref=e12]
          - button "Start Free Trial" [ref=e13]
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]:
          - generic [ref=e19]:
            - img
            - text: Developer-First Solution
          - generic [ref=e20]:
            - img
            - text: WCAG 2.1 AA Compliant
        - heading "Prevent $50k+ ADA Lawsuits Before They Cost You" [level=1] [ref=e21]:
          - text: Prevent $50k+ ADA Lawsuits
          - text: Before They Cost You
        - paragraph [ref=e22]:
          - text: Unlike overlay widgets that lawsuits allege don't work, AccessGuard scans your
          - strong [ref=e23]: actual code
          - text: ", generates"
          - strong [ref=e24]: AI-powered fixes
          - text: ", and integrates into your"
          - strong [ref=e25]: CI/CD pipeline
          - text: .
        - generic [ref=e26]:
          - button "Start Free Trial" [ref=e27]:
            - text: Start Free Trial
            - img
          - button "Watch Demo" [ref=e28]:
            - img
            - text: Watch Demo
        - generic [ref=e29]:
          - generic [ref=e30]:
            - img [ref=e31]
            - text: No credit card required
          - generic [ref=e33]:
            - img [ref=e34]
            - text: 14-day free trial
          - generic [ref=e36]:
            - img [ref=e37]
            - text: Cancel anytime
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e46]: app.accessguard.io/dashboard
          - generic [ref=e50]:
            - generic [ref=e51]:
              - generic [ref=e52]:
                - generic [ref=e53]:
                  - img [ref=e54]
                  - generic [ref=e58]: Risk Score
                - generic [ref=e59]: "78"
                - generic [ref=e60]: +5 this week
              - generic [ref=e61]:
                - generic [ref=e64]: Critical
                - generic [ref=e65]: "12"
                - generic [ref=e66]: "-3 this week"
              - generic [ref=e67]:
                - generic [ref=e70]: Serious
                - generic [ref=e71]: "45"
                - generic [ref=e72]: "-8 this week"
              - generic [ref=e73]:
                - generic [ref=e74]:
                  - img [ref=e75]
                  - generic [ref=e77]: Scans
                - generic [ref=e78]: "156"
                - generic [ref=e79]: +12 this week
            - generic [ref=e81]:
              - img [ref=e82]
              - text: Violation Trends
            - generic [ref=e85]:
              - generic [ref=e86]:
                - generic [ref=e88]: Missing form labels
                - generic [ref=e89]: /checkout
                - button "Fix" [ref=e90]
              - generic [ref=e91]:
                - generic [ref=e93]: Low color contrast
                - generic [ref=e94]: /products
                - button "Fix" [ref=e95]
              - generic [ref=e96]:
                - generic [ref=e98]: Missing alt text
                - generic [ref=e99]: /about
                - button "Fix" [ref=e100]
        - generic [ref=e101]:
          - img [ref=e102]
          - text: WCAG 2.1 AA Compliant
        - generic [ref=e105]:
          - img [ref=e106]
          - generic [ref=e109]: PR Created
          - img [ref=e110]
    - generic [ref=e114]:
      - paragraph [ref=e115]: Trusted by companies preventing ADA lawsuits
      - generic [ref=e116]:
        - generic [ref=e117]: TechCorp
        - generic [ref=e118]: StartupX
        - generic [ref=e119]: EnterpriseCo
        - generic [ref=e120]: AgencyPro
        - generic [ref=e121]: RetailMax
    - generic [ref=e123]:
      - generic [ref=e124]:
        - generic [ref=e125]: Features
        - heading "Why AccessGuard Beats Overlay Widgets" [level=2] [ref=e126]
        - paragraph [ref=e127]: Unlike accessiBe and other overlays (which lawsuits allege don't work), AccessGuard scans your actual code and generates real fixes.
      - generic [ref=e128]:
        - generic [ref=e130] [cursor=pointer]:
          - generic [ref=e131]:
            - img [ref=e133]
            - generic [ref=e135]: Real WCAG Scanning
            - generic [ref=e136]: Puppeteer-powered headless browser scans your actual website for WCAG 2.1 AA violations.
          - list [ref=e138]:
            - listitem [ref=e139]:
              - img [ref=e140]
              - text: axe-core integration
            - listitem [ref=e142]:
              - img [ref=e143]
              - text: Custom rule detection
            - listitem [ref=e145]:
              - img [ref=e146]
              - text: Screenshot capture
            - listitem [ref=e148]:
              - img [ref=e149]
              - text: CI/CD pipeline ready
        - generic [ref=e152] [cursor=pointer]:
          - generic [ref=e153]:
            - img [ref=e155]
            - generic [ref=e157]: AI-Powered Remediation
            - generic [ref=e158]: GPT-4 generates exact code fixes for each violation with explanations.
          - list [ref=e160]:
            - listitem [ref=e161]:
              - img [ref=e162]
              - text: Context-aware fixes
            - listitem [ref=e164]:
              - img [ref=e165]
              - text: Framework detection
            - listitem [ref=e167]:
              - img [ref=e168]
              - text: Copy-paste ready
            - listitem [ref=e170]:
              - img [ref=e171]
              - text: Confidence scores
        - generic [ref=e174] [cursor=pointer]:
          - generic [ref=e175]:
            - img [ref=e177]
            - generic [ref=e180]: GitHub Integration
            - generic [ref=e181]: Automatically create Pull Requests with accessibility fixes.
          - list [ref=e183]:
            - listitem [ref=e184]:
              - img [ref=e185]
              - text: OAuth installation
            - listitem [ref=e187]:
              - img [ref=e188]
              - text: Branch creation
            - listitem [ref=e190]:
              - img [ref=e191]
              - text: PR automation
            - listitem [ref=e193]:
              - img [ref=e194]
              - text: Monorepo support
        - generic [ref=e197] [cursor=pointer]:
          - generic [ref=e198]:
            - img [ref=e200]
            - generic [ref=e203]: Legal Shield™ Reports
            - generic [ref=e204]: Generate timestamped PDF reports for lawsuit defense.
          - list [ref=e206]:
            - listitem [ref=e207]:
              - img [ref=e208]
              - text: WCAG compliance proof
            - listitem [ref=e210]:
              - img [ref=e211]
              - text: Timestamped audits
            - listitem [ref=e213]:
              - img [ref=e214]
              - text: Custom branding
            - listitem [ref=e216]:
              - img [ref=e217]
              - text: Legal documentation
        - generic [ref=e220] [cursor=pointer]:
          - generic [ref=e221]:
            - img [ref=e223]
            - generic [ref=e225]: Continuous Monitoring
            - generic [ref=e226]: 24/7 scanning with alerts when new violations are introduced.
          - list [ref=e228]:
            - listitem [ref=e229]:
              - img [ref=e230]
              - text: Scheduled scans
            - listitem [ref=e232]:
              - img [ref=e233]
              - text: Email alerts
            - listitem [ref=e235]:
              - img [ref=e236]
              - text: Slack integration
            - listitem [ref=e238]:
              - img [ref=e239]
              - text: Webhook notifications
        - generic [ref=e242] [cursor=pointer]:
          - generic [ref=e243]:
            - img [ref=e245]
            - generic [ref=e250]: Agency White-Label
            - generic [ref=e251]: Resell AccessGuard with your branding. Perfect for agencies.
          - list [ref=e253]:
            - listitem [ref=e254]:
              - img [ref=e255]
              - text: Custom domains
            - listitem [ref=e257]:
              - img [ref=e258]
              - text: Brand customization
            - listitem [ref=e260]:
              - img [ref=e261]
              - text: Client management
            - listitem [ref=e263]:
              - img [ref=e264]
              - text: Wholesale pricing
    - generic [ref=e267]:
      - generic [ref=e268]:
        - generic [ref=e269]: Comparison
        - heading "Overlay Widget vs. AccessGuard" [level=2] [ref=e270]
        - paragraph [ref=e271]: See why developers choose real code fixes over JavaScript overlays
      - generic [ref=e272]:
        - generic [ref=e273]:
          - generic [ref=e274]:
            - img [ref=e276]
            - generic [ref=e280]: Overlay Widgets
            - generic [ref=e281]: accessiBe, UserWay, AudioEye, etc.
          - list [ref=e283]:
            - listitem [ref=e284]:
              - img [ref=e285]
              - generic [ref=e289]:
                - strong [ref=e290]: Lawsuits claim they don't work
                - text: "- Multiple plaintiffs have sued companies using overlays"
            - listitem [ref=e291]:
              - img [ref=e292]
              - generic [ref=e296]:
                - strong [ref=e297]: Band-aid solution
                - text: "- Doesn't fix actual code, just covers it up"
            - listitem [ref=e298]:
              - img [ref=e299]
              - generic [ref=e303]:
                - strong [ref=e304]: Can break functionality
                - text: "- JavaScript conflicts with existing code"
            - listitem [ref=e305]:
              - img [ref=e306]
              - generic [ref=e310]:
                - strong [ref=e311]: No CI/CD integration
                - text: "- Can't catch issues before deployment"
            - listitem [ref=e312]:
              - img [ref=e313]
              - generic [ref=e317]:
                - strong [ref=e318]: No developer control
                - text: "- Third-party script you can't customize"
            - listitem [ref=e319]:
              - img [ref=e320]
              - generic [ref=e324]:
                - strong [ref=e325]: Requires JavaScript
                - text: "- Doesn't work for users who disable JS"
        - generic [ref=e326]:
          - generic [ref=e327]:
            - img [ref=e329]
            - generic [ref=e332]:
              - text: AccessGuard
              - generic [ref=e333]: Recommended
            - generic [ref=e334]: Developer-first accessibility platform
          - list [ref=e336]:
            - listitem [ref=e337]:
              - img [ref=e338]
              - generic [ref=e341]:
                - strong [ref=e342]: Fixes actual code
                - text: "- Real commits, real changes, real accessibility"
            - listitem [ref=e343]:
              - img [ref=e344]
              - generic [ref=e347]:
                - strong [ref=e348]: AI-generated fixes
                - text: "- GPT-4 produces exact code remediation"
            - listitem [ref=e349]:
              - img [ref=e350]
              - generic [ref=e353]:
                - strong [ref=e354]: GitHub PR creation
                - text: "- Auto-create PRs with accessibility fixes"
            - listitem [ref=e355]:
              - img [ref=e356]
              - generic [ref=e359]:
                - strong [ref=e360]: CI/CD integration
                - text: "- Block deployments with violations"
            - listitem [ref=e361]:
              - img [ref=e362]
              - generic [ref=e365]:
                - strong [ref=e366]: Legal Shield™ reports
                - text: "- Document compliance for legal defense"
            - listitem [ref=e367]:
              - img [ref=e368]
              - generic [ref=e371]:
                - strong [ref=e372]: Works without JS
                - text: "- Server-side scanning of HTML"
    - generic [ref=e374]:
      - generic [ref=e375]:
        - generic [ref=e376]: Pricing
        - heading "Simple, Transparent Pricing" [level=2] [ref=e377]
        - paragraph [ref=e378]: Start free, scale as you grow. No hidden fees.
      - generic [ref=e379]:
        - generic [ref=e380]:
          - generic [ref=e381]:
            - generic [ref=e382]: Starter
            - generic [ref=e383]: Perfect for small websites and personal projects
          - generic [ref=e384]:
            - generic [ref=e385]:
              - generic [ref=e386]: $49
              - generic [ref=e387]: /month
            - list [ref=e388]:
              - listitem [ref=e389]:
                - img [ref=e390]
                - text: 1 website
              - listitem [ref=e392]:
                - img [ref=e393]
                - text: 100 pages/month
              - listitem [ref=e395]:
                - img [ref=e396]
                - text: Basic WCAG scanning
              - listitem [ref=e398]:
                - img [ref=e399]
                - text: Email reports
              - listitem [ref=e401]:
                - img [ref=e402]
                - text: API access
              - listitem [ref=e404]:
                - img [ref=e405]
                - text: Community support
            - button "Start Free Trial" [ref=e407]
        - generic [ref=e408]:
          - generic [ref=e410]: Most Popular
          - generic [ref=e411]:
            - generic [ref=e412]: Agency
            - generic [ref=e413]: For agencies managing multiple client websites
          - generic [ref=e414]:
            - generic [ref=e415]:
              - generic [ref=e416]: $199
              - generic [ref=e417]: /month
            - list [ref=e418]:
              - listitem [ref=e419]:
                - img [ref=e420]
                - text: 10 websites
              - listitem [ref=e422]:
                - img [ref=e423]
                - text: 1,000 pages/month
              - listitem [ref=e425]:
                - img [ref=e426]
                - text: AI remediation code
              - listitem [ref=e428]:
                - img [ref=e429]
                - text: GitHub integration
              - listitem [ref=e431]:
                - img [ref=e432]
                - text: White-label reports
              - listitem [ref=e434]:
                - img [ref=e435]
                - text: Priority support
              - listitem [ref=e437]:
                - img [ref=e438]
                - text: Client management
              - listitem [ref=e440]:
                - img [ref=e441]
                - text: Custom branding
            - button "Start Free Trial" [ref=e443]
        - generic [ref=e444]:
          - generic [ref=e445]:
            - generic [ref=e446]: Enterprise
            - generic [ref=e447]: For large organizations with custom needs
          - generic [ref=e448]:
            - generic [ref=e449]: Custom
            - list [ref=e450]:
              - listitem [ref=e451]:
                - img [ref=e452]
                - text: Unlimited websites
              - listitem [ref=e454]:
                - img [ref=e455]
                - text: Custom page limits
              - listitem [ref=e457]:
                - img [ref=e458]
                - text: CI/CD integration
              - listitem [ref=e460]:
                - img [ref=e461]
                - text: Dedicated account manager
              - listitem [ref=e463]:
                - img [ref=e464]
                - text: SLA guarantee
              - listitem [ref=e466]:
                - img [ref=e467]
                - text: On-premise option
              - listitem [ref=e469]:
                - img [ref=e470]
                - text: SSO/SAML
              - listitem [ref=e472]:
                - img [ref=e473]
                - text: Custom integrations
            - button "Contact Sales" [ref=e475]
      - generic [ref=e476]:
        - paragraph [ref=e477]: "Need more? All plans include:"
        - generic [ref=e478]:
          - generic [ref=e479]:
            - img [ref=e480]
            - text: 14-day free trial
          - generic [ref=e482]:
            - img [ref=e483]
            - text: No credit card required
          - generic [ref=e485]:
            - img [ref=e486]
            - text: Cancel anytime
          - generic [ref=e488]:
            - img [ref=e489]
            - text: Email support
    - generic [ref=e492]:
      - generic [ref=e493]:
        - generic [ref=e494]: FAQ
        - heading "Frequently Asked Questions" [level=2] [ref=e495]
      - generic [ref=e496]:
        - generic [ref=e497]:
          - generic [ref=e499]:
            - img [ref=e500]
            - text: How is AccessGuard different from overlay widgets like accessiBe?
          - paragraph [ref=e504]: Overlay widgets add a JavaScript layer that attempts to fix accessibility issues at runtime. However, they've been subject to lawsuits alleging they don't provide true accessibility. AccessGuard scans your actual code and generates real fixes that you commit to your codebase—making your site genuinely accessible.
        - generic [ref=e505]:
          - generic [ref=e507]:
            - img [ref=e508]
            - text: Can AccessGuard prevent ADA lawsuits?
          - paragraph [ref=e512]: While no tool can guarantee immunity, AccessGuard helps demonstrate good-faith compliance efforts. Our timestamped audit reports, continuous monitoring, and documented remediation provide evidence of ongoing accessibility efforts—a key factor in legal defense.
        - generic [ref=e513]:
          - generic [ref=e515]:
            - img [ref=e516]
            - text: How accurate is the AI remediation?
          - paragraph [ref=e520]: Our GPT-4 powered remediation has an average confidence score of 92%. Each fix includes an explanation so developers can understand and verify the change before applying. We recommend code review before merging any automated fixes.
        - generic [ref=e521]:
          - generic [ref=e523]:
            - img [ref=e524]
            - text: Does AccessGuard work with React/Vue/Angular?
          - paragraph [ref=e528]: Yes! AccessGuard scans the rendered DOM, so it works with any JavaScript framework. For AI remediation, we detect your framework and generate appropriate code (JSX for React, SFC for Vue, etc.).
        - generic [ref=e529]:
          - generic [ref=e531]:
            - img [ref=e532]
            - text: What happens after I add a website?
          - paragraph [ref=e536]: We immediately queue your site for scanning. Our Puppeteer bot visits each page, runs axe-core and custom accessibility checks, captures screenshots of violations, and generates AI remediation suggestions—all within minutes.
        - generic [ref=e537]:
          - generic [ref=e539]:
            - img [ref=e540]
            - text: Can I integrate AccessGuard into my CI/CD pipeline?
          - paragraph [ref=e544]: Absolutely! Use our GitHub Action to scan on every pull request. Block merges that introduce critical violations, track accessibility over time, and enforce compliance as part of your development workflow.
    - generic [ref=e548]:
      - img [ref=e549]
      - heading "Ready to Make Your Site Accessible?" [level=2] [ref=e551]
      - paragraph [ref=e552]: Join hundreds of companies using AccessGuard to prevent ADA lawsuits and build a more accessible web for everyone.
      - button "Start Your Free Trial" [ref=e554]:
        - text: Start Your Free Trial
        - img
      - paragraph [ref=e555]: No credit card required • 14-day free trial • Cancel anytime
    - contentinfo [ref=e556]:
      - generic [ref=e557]:
        - generic [ref=e558]:
          - generic [ref=e559]:
            - generic [ref=e560]:
              - img [ref=e561]
              - generic [ref=e563]: AccessGuard
            - paragraph [ref=e564]: Making the web accessible, one commit at a time. Prevent lawsuits, protect users, build better products.
            - generic [ref=e565]:
              - generic [ref=e566]:
                - img
                - text: SOC 2 Compliant
              - generic [ref=e567]:
                - img
                - text: GDPR Ready
          - generic [ref=e568]:
            - heading "Product" [level=4] [ref=e569]
            - list [ref=e570]:
              - listitem [ref=e571]:
                - link "Features" [ref=e572] [cursor=pointer]:
                  - /url: "#features"
              - listitem [ref=e573]:
                - link "Pricing" [ref=e574] [cursor=pointer]:
                  - /url: "#pricing"
              - listitem [ref=e575]:
                - link "Documentation" [ref=e576] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e577]:
                - link "API Reference" [ref=e578] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e579]:
                - link "GitHub Action" [ref=e580] [cursor=pointer]:
                  - /url: "#"
          - generic [ref=e581]:
            - heading "Company" [level=4] [ref=e582]
            - list [ref=e583]:
              - listitem [ref=e584]:
                - link "About" [ref=e585] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e586]:
                - link "Blog" [ref=e587] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e588]:
                - link "Careers" [ref=e589] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e590]:
                - link "Press" [ref=e591] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e592]:
                - link "Contact" [ref=e593] [cursor=pointer]:
                  - /url: "#"
          - generic [ref=e594]:
            - heading "Legal" [level=4] [ref=e595]
            - list [ref=e596]:
              - listitem [ref=e597]:
                - link "Privacy Policy" [ref=e598] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e599]:
                - link "Terms of Service" [ref=e600] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e601]:
                - link "Cookie Policy" [ref=e602] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e603]:
                - link "Security" [ref=e604] [cursor=pointer]:
                  - /url: "#"
        - generic [ref=e605]:
          - paragraph [ref=e606]: © 2024 AccessGuard. All rights reserved.
          - generic [ref=e607]:
            - link [ref=e608] [cursor=pointer]:
              - /url: "#"
              - img [ref=e609]
            - link [ref=e612] [cursor=pointer]:
              - /url: "#"
              - img [ref=e613]
            - link [ref=e617] [cursor=pointer]:
              - /url: "#"
              - img [ref=e618]
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e625] [cursor=pointer]:
    - img [ref=e626]
  - alert [ref=e629]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Landing Page', () => {
  4  |   test('should display landing page with hero section', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     
  7  |     // Check hero section
  8  |     await expect(page.locator('h1')).toContainText('ADA Lawsuits');
  9  |   });
  10 | 
  11 |   test('should navigate to dashboard when clicking Get Started', async ({ page }) => {
  12 |     await page.goto('/');
  13 |     
  14 |     // Click the first Start Free Trial button
  15 |     await page.locator('button:has-text("Start Free Trial")').first().click();
  16 |     
  17 |     // Should see dashboard content
  18 |     await page.waitForTimeout(1000);
  19 |     await expect(page.locator('text=Dashboard')).toBeVisible();
  20 |   });
  21 | 
  22 |   test('should display features section', async ({ page }) => {
  23 |     await page.goto('/');
  24 |     
  25 |     // Scroll to features
  26 |     await page.locator('#features').scrollIntoViewIfNeeded();
  27 |     
  28 |     // Check features
  29 |     await expect(page.locator('text=Real WCAG Scanning')).toBeVisible();
  30 |     await expect(page.locator('text=AI-Powered Remediation')).toBeVisible();
  31 |   });
  32 | 
  33 |   test('should display pricing section', async ({ page }) => {
  34 |     await page.goto('/');
  35 |     
  36 |     // Scroll to pricing
  37 |     await page.locator('#pricing').scrollIntoViewIfNeeded();
  38 |     
  39 |     // Check pricing cards
  40 |     await expect(page.locator('text=Starter')).toBeVisible();
> 41 |     await expect(page.locator('text=Agency')).toBeVisible();
     |                                               ^ Error: expect(locator).toBeVisible() failed
  42 |   });
  43 | 
  44 |   test('should be accessible - no critical a11y issues on landing', async ({ page }) => {
  45 |     await page.goto('/');
  46 |     
  47 |     // Check for main landmark
  48 |     const main = page.locator('main');
  49 |     await expect(main).toBeVisible();
  50 |     
  51 |     // Check for navigation
  52 |     const nav = page.locator('nav');
  53 |     await expect(nav).toBeVisible();
  54 |   });
  55 | });
  56 | 
```