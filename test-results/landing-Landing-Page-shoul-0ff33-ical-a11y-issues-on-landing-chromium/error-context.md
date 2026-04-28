# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.ts >> Landing Page >> should be accessible - no critical a11y issues on landing
- Location: e2e/landing.spec.ts:44:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('main')

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
          - link "Features" [ref=e12] [cursor=pointer]:
            - /url: "#features"
          - link "Comparison" [ref=e13] [cursor=pointer]:
            - /url: "#comparison"
          - link "Pricing" [ref=e14] [cursor=pointer]:
            - /url: "#pricing"
          - link "FAQ" [ref=e15] [cursor=pointer]:
            - /url: "#faq"
        - generic [ref=e16]:
          - button "Sign In" [ref=e17]
          - button "Start Free Trial" [ref=e18]
    - generic [ref=e21]:
      - generic [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]:
            - img
            - text: Developer-First Solution
          - generic [ref=e25]:
            - img
            - text: WCAG 2.1 AA Compliant
        - heading "Prevent $50k+ ADA Lawsuits Before They Cost You" [level=1] [ref=e26]:
          - text: Prevent $50k+ ADA Lawsuits
          - text: Before They Cost You
        - paragraph [ref=e27]:
          - text: Unlike overlay widgets that lawsuits allege don't work, AccessGuard scans your
          - strong [ref=e28]: actual code
          - text: ", generates"
          - strong [ref=e29]: AI-powered fixes
          - text: ", and integrates into your"
          - strong [ref=e30]: CI/CD pipeline
          - text: .
        - generic [ref=e31]:
          - button "Start Free Trial" [ref=e32]:
            - text: Start Free Trial
            - img
          - button "Watch Demo" [ref=e33]:
            - img
            - text: Watch Demo
        - generic [ref=e34]:
          - generic [ref=e35]:
            - img [ref=e36]
            - text: No credit card required
          - generic [ref=e38]:
            - img [ref=e39]
            - text: 14-day free trial
          - generic [ref=e41]:
            - img [ref=e42]
            - text: Cancel anytime
      - generic [ref=e44]:
        - generic [ref=e45]:
          - generic [ref=e51]: app.accessguard.io/dashboard
          - generic [ref=e55]:
            - generic [ref=e56]:
              - generic [ref=e57]:
                - generic [ref=e58]:
                  - img [ref=e59]
                  - generic [ref=e63]: Risk Score
                - generic [ref=e64]: "78"
                - generic [ref=e65]: +5 this week
              - generic [ref=e66]:
                - generic [ref=e67]:
                  - img [ref=e68]
                  - generic [ref=e70]: Critical
                - generic [ref=e71]: "12"
                - generic [ref=e72]: "-3 this week"
              - generic [ref=e73]:
                - generic [ref=e74]:
                  - img [ref=e75]
                  - generic [ref=e77]: Serious
                - generic [ref=e78]: "45"
                - generic [ref=e79]: "-8 this week"
              - generic [ref=e80]:
                - generic [ref=e81]:
                  - img [ref=e82]
                  - generic [ref=e84]: Scans
                - generic [ref=e85]: "156"
                - generic [ref=e86]: +12 this week
            - generic [ref=e88]:
              - img [ref=e89]
              - text: Violation Trends
            - generic [ref=e92]:
              - generic [ref=e93]:
                - generic [ref=e95]: Missing form labels
                - generic [ref=e96]: /checkout
                - button "Fix" [ref=e97]
              - generic [ref=e98]:
                - generic [ref=e100]: Low color contrast
                - generic [ref=e101]: /products
                - button "Fix" [ref=e102]
              - generic [ref=e103]:
                - generic [ref=e105]: Missing alt text
                - generic [ref=e106]: /about
                - button "Fix" [ref=e107]
        - generic [ref=e108]:
          - img [ref=e109]
          - text: WCAG 2.1 AA Compliant
        - generic [ref=e112]:
          - img [ref=e113]
          - generic [ref=e116]: PR Created
          - img [ref=e117]
    - generic [ref=e121]:
      - paragraph [ref=e122]: Trusted by companies preventing ADA lawsuits
      - generic [ref=e123]:
        - generic [ref=e124]: TechCorp
        - generic [ref=e125]: StartupX
        - generic [ref=e126]: EnterpriseCo
        - generic [ref=e127]: AgencyPro
        - generic [ref=e128]: RetailMax
    - generic [ref=e130]:
      - generic [ref=e131]:
        - generic [ref=e132]: Features
        - heading "Why AccessGuard Beats Overlay Widgets" [level=2] [ref=e133]
        - paragraph [ref=e134]: Unlike accessiBe and other overlays (which lawsuits allege don't work), AccessGuard scans your actual code and generates real fixes.
      - generic [ref=e135]:
        - generic [ref=e137] [cursor=pointer]:
          - generic [ref=e138]:
            - img [ref=e140]
            - generic [ref=e142]: Real WCAG Scanning
            - generic [ref=e143]: Puppeteer-powered headless browser scans your actual website for WCAG 2.1 AA violations.
          - list [ref=e145]:
            - listitem [ref=e146]:
              - img [ref=e147]
              - text: axe-core integration
            - listitem [ref=e149]:
              - img [ref=e150]
              - text: Custom rule detection
            - listitem [ref=e152]:
              - img [ref=e153]
              - text: Screenshot capture
            - listitem [ref=e155]:
              - img [ref=e156]
              - text: CI/CD pipeline ready
        - generic [ref=e159] [cursor=pointer]:
          - generic [ref=e160]:
            - img [ref=e162]
            - generic [ref=e164]: AI-Powered Remediation
            - generic [ref=e165]: GPT-4 generates exact code fixes for each violation with explanations.
          - list [ref=e167]:
            - listitem [ref=e168]:
              - img [ref=e169]
              - text: Context-aware fixes
            - listitem [ref=e171]:
              - img [ref=e172]
              - text: Framework detection
            - listitem [ref=e174]:
              - img [ref=e175]
              - text: Copy-paste ready
            - listitem [ref=e177]:
              - img [ref=e178]
              - text: Confidence scores
        - generic [ref=e181] [cursor=pointer]:
          - generic [ref=e182]:
            - img [ref=e184]
            - generic [ref=e187]: GitHub Integration
            - generic [ref=e188]: Automatically create Pull Requests with accessibility fixes.
          - list [ref=e190]:
            - listitem [ref=e191]:
              - img [ref=e192]
              - text: OAuth installation
            - listitem [ref=e194]:
              - img [ref=e195]
              - text: Branch creation
            - listitem [ref=e197]:
              - img [ref=e198]
              - text: PR automation
            - listitem [ref=e200]:
              - img [ref=e201]
              - text: Monorepo support
        - generic [ref=e204] [cursor=pointer]:
          - generic [ref=e205]:
            - img [ref=e207]
            - generic [ref=e210]: Legal Shield™ Reports
            - generic [ref=e211]: Generate timestamped PDF reports for lawsuit defense.
          - list [ref=e213]:
            - listitem [ref=e214]:
              - img [ref=e215]
              - text: WCAG compliance proof
            - listitem [ref=e217]:
              - img [ref=e218]
              - text: Timestamped audits
            - listitem [ref=e220]:
              - img [ref=e221]
              - text: Custom branding
            - listitem [ref=e223]:
              - img [ref=e224]
              - text: Legal documentation
        - generic [ref=e227] [cursor=pointer]:
          - generic [ref=e228]:
            - img [ref=e230]
            - generic [ref=e232]: Continuous Monitoring
            - generic [ref=e233]: 24/7 scanning with alerts when new violations are introduced.
          - list [ref=e235]:
            - listitem [ref=e236]:
              - img [ref=e237]
              - text: Scheduled scans
            - listitem [ref=e239]:
              - img [ref=e240]
              - text: Email alerts
            - listitem [ref=e242]:
              - img [ref=e243]
              - text: Slack integration
            - listitem [ref=e245]:
              - img [ref=e246]
              - text: Webhook notifications
        - generic [ref=e249] [cursor=pointer]:
          - generic [ref=e250]:
            - img [ref=e252]
            - generic [ref=e257]: Agency White-Label
            - generic [ref=e258]: Resell AccessGuard with your branding. Perfect for agencies.
          - list [ref=e260]:
            - listitem [ref=e261]:
              - img [ref=e262]
              - text: Custom domains
            - listitem [ref=e264]:
              - img [ref=e265]
              - text: Brand customization
            - listitem [ref=e267]:
              - img [ref=e268]
              - text: Client management
            - listitem [ref=e270]:
              - img [ref=e271]
              - text: Wholesale pricing
    - generic [ref=e274]:
      - generic [ref=e275]:
        - generic [ref=e276]: Comparison
        - heading "Overlay Widget vs. AccessGuard" [level=2] [ref=e277]
        - paragraph [ref=e278]: See why developers choose real code fixes over JavaScript overlays
      - generic [ref=e279]:
        - generic [ref=e280]:
          - generic [ref=e281]:
            - img [ref=e283]
            - generic [ref=e287]: Overlay Widgets
            - generic [ref=e288]: accessiBe, UserWay, AudioEye, etc.
          - list [ref=e290]:
            - listitem [ref=e291]:
              - img [ref=e292]
              - generic [ref=e296]:
                - strong [ref=e297]: Lawsuits claim they don't work
                - text: "- Multiple plaintiffs have sued companies using overlays"
            - listitem [ref=e298]:
              - img [ref=e299]
              - generic [ref=e303]:
                - strong [ref=e304]: Band-aid solution
                - text: "- Doesn't fix actual code, just covers it up"
            - listitem [ref=e305]:
              - img [ref=e306]
              - generic [ref=e310]:
                - strong [ref=e311]: Can break functionality
                - text: "- JavaScript conflicts with existing code"
            - listitem [ref=e312]:
              - img [ref=e313]
              - generic [ref=e317]:
                - strong [ref=e318]: No CI/CD integration
                - text: "- Can't catch issues before deployment"
            - listitem [ref=e319]:
              - img [ref=e320]
              - generic [ref=e324]:
                - strong [ref=e325]: No developer control
                - text: "- Third-party script you can't customize"
            - listitem [ref=e326]:
              - img [ref=e327]
              - generic [ref=e331]:
                - strong [ref=e332]: Requires JavaScript
                - text: "- Doesn't work for users who disable JS"
        - generic [ref=e333]:
          - generic [ref=e334]:
            - img [ref=e336]
            - generic [ref=e339]:
              - text: AccessGuard
              - generic [ref=e340]: Recommended
            - generic [ref=e341]: Developer-first accessibility platform
          - list [ref=e343]:
            - listitem [ref=e344]:
              - img [ref=e345]
              - generic [ref=e348]:
                - strong [ref=e349]: Fixes actual code
                - text: "- Real commits, real changes, real accessibility"
            - listitem [ref=e350]:
              - img [ref=e351]
              - generic [ref=e354]:
                - strong [ref=e355]: AI-generated fixes
                - text: "- GPT-4 produces exact code remediation"
            - listitem [ref=e356]:
              - img [ref=e357]
              - generic [ref=e360]:
                - strong [ref=e361]: GitHub PR creation
                - text: "- Auto-create PRs with accessibility fixes"
            - listitem [ref=e362]:
              - img [ref=e363]
              - generic [ref=e366]:
                - strong [ref=e367]: CI/CD integration
                - text: "- Block deployments with violations"
            - listitem [ref=e368]:
              - img [ref=e369]
              - generic [ref=e372]:
                - strong [ref=e373]: Legal Shield™ reports
                - text: "- Document compliance for legal defense"
            - listitem [ref=e374]:
              - img [ref=e375]
              - generic [ref=e378]:
                - strong [ref=e379]: Works without JS
                - text: "- Server-side scanning of HTML"
    - generic [ref=e381]:
      - generic [ref=e382]:
        - generic [ref=e383]: Pricing
        - heading "Simple, Transparent Pricing" [level=2] [ref=e384]
        - paragraph [ref=e385]: Start free, scale as you grow. No hidden fees.
      - generic [ref=e386]:
        - generic [ref=e387]:
          - generic [ref=e388]:
            - generic [ref=e389]: Starter
            - generic [ref=e390]: Perfect for small websites and personal projects
          - generic [ref=e391]:
            - generic [ref=e392]:
              - generic [ref=e393]: $49
              - generic [ref=e394]: /month
            - list [ref=e395]:
              - listitem [ref=e396]:
                - img [ref=e397]
                - text: 1 website
              - listitem [ref=e399]:
                - img [ref=e400]
                - text: 100 pages/month
              - listitem [ref=e402]:
                - img [ref=e403]
                - text: Basic WCAG scanning
              - listitem [ref=e405]:
                - img [ref=e406]
                - text: Email reports
              - listitem [ref=e408]:
                - img [ref=e409]
                - text: API access
              - listitem [ref=e411]:
                - img [ref=e412]
                - text: Community support
            - button "Start Free Trial" [ref=e414]
        - generic [ref=e415]:
          - generic [ref=e417]: Most Popular
          - generic [ref=e418]:
            - generic [ref=e419]: Agency
            - generic [ref=e420]: For agencies managing multiple client websites
          - generic [ref=e421]:
            - generic [ref=e422]:
              - generic [ref=e423]: $199
              - generic [ref=e424]: /month
            - list [ref=e425]:
              - listitem [ref=e426]:
                - img [ref=e427]
                - text: 10 websites
              - listitem [ref=e429]:
                - img [ref=e430]
                - text: 1,000 pages/month
              - listitem [ref=e432]:
                - img [ref=e433]
                - text: AI remediation code
              - listitem [ref=e435]:
                - img [ref=e436]
                - text: GitHub integration
              - listitem [ref=e438]:
                - img [ref=e439]
                - text: White-label reports
              - listitem [ref=e441]:
                - img [ref=e442]
                - text: Priority support
              - listitem [ref=e444]:
                - img [ref=e445]
                - text: Client management
              - listitem [ref=e447]:
                - img [ref=e448]
                - text: Custom branding
            - button "Start Free Trial" [ref=e450]
        - generic [ref=e451]:
          - generic [ref=e452]:
            - generic [ref=e453]: Enterprise
            - generic [ref=e454]: For large organizations with custom needs
          - generic [ref=e455]:
            - generic [ref=e456]: Custom
            - list [ref=e457]:
              - listitem [ref=e458]:
                - img [ref=e459]
                - text: Unlimited websites
              - listitem [ref=e461]:
                - img [ref=e462]
                - text: Custom page limits
              - listitem [ref=e464]:
                - img [ref=e465]
                - text: CI/CD integration
              - listitem [ref=e467]:
                - img [ref=e468]
                - text: Dedicated account manager
              - listitem [ref=e470]:
                - img [ref=e471]
                - text: SLA guarantee
              - listitem [ref=e473]:
                - img [ref=e474]
                - text: On-premise option
              - listitem [ref=e476]:
                - img [ref=e477]
                - text: SSO/SAML
              - listitem [ref=e479]:
                - img [ref=e480]
                - text: Custom integrations
            - button "Contact Sales" [ref=e482]
      - generic [ref=e483]:
        - paragraph [ref=e484]: "Need more? All plans include:"
        - generic [ref=e485]:
          - generic [ref=e486]:
            - img [ref=e487]
            - text: 14-day free trial
          - generic [ref=e489]:
            - img [ref=e490]
            - text: No credit card required
          - generic [ref=e492]:
            - img [ref=e493]
            - text: Cancel anytime
          - generic [ref=e495]:
            - img [ref=e496]
            - text: Email support
    - generic [ref=e499]:
      - generic [ref=e500]:
        - generic [ref=e501]: FAQ
        - heading "Frequently Asked Questions" [level=2] [ref=e502]
      - generic [ref=e503]:
        - generic [ref=e504]:
          - generic [ref=e506]:
            - img [ref=e507]
            - text: How is AccessGuard different from overlay widgets like accessiBe?
          - paragraph [ref=e511]: Overlay widgets add a JavaScript layer that attempts to fix accessibility issues at runtime. However, they've been subject to lawsuits alleging they don't provide true accessibility. AccessGuard scans your actual code and generates real fixes that you commit to your codebase—making your site genuinely accessible.
        - generic [ref=e512]:
          - generic [ref=e514]:
            - img [ref=e515]
            - text: Can AccessGuard prevent ADA lawsuits?
          - paragraph [ref=e519]: While no tool can guarantee immunity, AccessGuard helps demonstrate good-faith compliance efforts. Our timestamped audit reports, continuous monitoring, and documented remediation provide evidence of ongoing accessibility efforts—a key factor in legal defense.
        - generic [ref=e520]:
          - generic [ref=e522]:
            - img [ref=e523]
            - text: How accurate is the AI remediation?
          - paragraph [ref=e527]: Our GPT-4 powered remediation has an average confidence score of 92%. Each fix includes an explanation so developers can understand and verify the change before applying. We recommend code review before merging any automated fixes.
        - generic [ref=e528]:
          - generic [ref=e530]:
            - img [ref=e531]
            - text: Does AccessGuard work with React/Vue/Angular?
          - paragraph [ref=e535]: Yes! AccessGuard scans the rendered DOM, so it works with any JavaScript framework. For AI remediation, we detect your framework and generate appropriate code (JSX for React, SFC for Vue, etc.).
        - generic [ref=e536]:
          - generic [ref=e538]:
            - img [ref=e539]
            - text: What happens after I add a website?
          - paragraph [ref=e543]: We immediately queue your site for scanning. Our Puppeteer bot visits each page, runs axe-core and custom accessibility checks, captures screenshots of violations, and generates AI remediation suggestions—all within minutes.
        - generic [ref=e544]:
          - generic [ref=e546]:
            - img [ref=e547]
            - text: Can I integrate AccessGuard into my CI/CD pipeline?
          - paragraph [ref=e551]: Absolutely! Use our GitHub Action to scan on every pull request. Block merges that introduce critical violations, track accessibility over time, and enforce compliance as part of your development workflow.
    - generic [ref=e555]:
      - img [ref=e556]
      - heading "Ready to Make Your Site Accessible?" [level=2] [ref=e558]
      - paragraph [ref=e559]: Join hundreds of companies using AccessGuard to prevent ADA lawsuits and build a more accessible web for everyone.
      - button "Start Your Free Trial" [ref=e561]:
        - text: Start Your Free Trial
        - img
      - paragraph [ref=e562]: No credit card required • 14-day free trial • Cancel anytime
    - contentinfo [ref=e563]:
      - generic [ref=e564]:
        - generic [ref=e565]:
          - generic [ref=e566]:
            - generic [ref=e567]:
              - img [ref=e568]
              - generic [ref=e570]: AccessGuard
            - paragraph [ref=e571]: Making the web accessible, one commit at a time. Prevent lawsuits, protect users, build better products.
            - generic [ref=e572]:
              - generic [ref=e573]:
                - img
                - text: SOC 2 Compliant
              - generic [ref=e574]:
                - img
                - text: GDPR Ready
          - generic [ref=e575]:
            - heading "Product" [level=4] [ref=e576]
            - list [ref=e577]:
              - listitem [ref=e578]:
                - link "Features" [ref=e579] [cursor=pointer]:
                  - /url: "#features"
              - listitem [ref=e580]:
                - link "Pricing" [ref=e581] [cursor=pointer]:
                  - /url: "#pricing"
              - listitem [ref=e582]:
                - link "Documentation" [ref=e583] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e584]:
                - link "API Reference" [ref=e585] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e586]:
                - link "GitHub Action" [ref=e587] [cursor=pointer]:
                  - /url: "#"
          - generic [ref=e588]:
            - heading "Company" [level=4] [ref=e589]
            - list [ref=e590]:
              - listitem [ref=e591]:
                - link "About" [ref=e592] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e593]:
                - link "Blog" [ref=e594] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e595]:
                - link "Careers" [ref=e596] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e597]:
                - link "Press" [ref=e598] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e599]:
                - link "Contact" [ref=e600] [cursor=pointer]:
                  - /url: "#"
          - generic [ref=e601]:
            - heading "Legal" [level=4] [ref=e602]
            - list [ref=e603]:
              - listitem [ref=e604]:
                - link "Privacy Policy" [ref=e605] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e606]:
                - link "Terms of Service" [ref=e607] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e608]:
                - link "Cookie Policy" [ref=e609] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e610]:
                - link "Security" [ref=e611] [cursor=pointer]:
                  - /url: "#"
        - generic [ref=e612]:
          - paragraph [ref=e613]: © 2024 AccessGuard. All rights reserved.
          - generic [ref=e614]:
            - link [ref=e615] [cursor=pointer]:
              - /url: "#"
              - img [ref=e616]
            - link [ref=e619] [cursor=pointer]:
              - /url: "#"
              - img [ref=e620]
            - link [ref=e624] [cursor=pointer]:
              - /url: "#"
              - img [ref=e625]
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e632] [cursor=pointer]:
    - img [ref=e633]
  - alert [ref=e636]
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
  41 |     await expect(page.locator('text=Agency')).toBeVisible();
  42 |   });
  43 | 
  44 |   test('should be accessible - no critical a11y issues on landing', async ({ page }) => {
  45 |     await page.goto('/');
  46 |     
  47 |     // Check for main landmark
  48 |     const main = page.locator('main');
> 49 |     await expect(main).toBeVisible();
     |                        ^ Error: expect(locator).toBeVisible() failed
  50 |     
  51 |     // Check for navigation
  52 |     const nav = page.locator('nav');
  53 |     await expect(nav).toBeVisible();
  54 |   });
  55 | });
  56 | 
```