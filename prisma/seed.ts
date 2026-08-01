import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const wcagRules = [
  {
    ruleId: 'color-contrast',
    name: 'Color Contrast',
    description: 'Ensures the contrast between foreground and background colors meets WCAG requirements',
    wcagCriteria: '1.4.3',
    level: 'AA',
    category: 'perceptible',
    howToFix: 'Increase the contrast ratio between text and background. For normal text, use a ratio of at least 4.5:1. For large text (18pt or 14pt bold), use at least 3:1.'
  },
  {
    ruleId: 'image-alt',
    name: 'Image Alternative Text',
    description: 'Ensures <img> elements have alternate text or are marked as decorative',
    wcagCriteria: '1.1.1',
    level: 'A',
    category: 'perceptible',
    howToFix: 'Add an alt attribute to all <img> elements. For decorative images, use alt="". For informative images, provide meaningful alternative text.'
  },
  {
    ruleId: 'label',
    name: 'Form Labels',
    description: 'Ensures every form element has a label',
    wcagCriteria: '1.3.1',
    level: 'A',
    category: 'perceptible',
    howToFix: 'Associate a <label> element with each form control using the for attribute, or wrap the form control inside the <label>.'
  },
  {
    ruleId: 'link-name',
    name: 'Link Name',
    description: 'Ensures links have discernible text',
    wcagCriteria: '2.4.4',
    level: 'A',
    category: 'operable',
    howToFix: 'Provide descriptive link text. Avoid generic phrases like "click here" or "read more". Use aria-label if the link contains only an icon.'
  },
  {
    ruleId: 'heading-order',
    name: 'Heading Order',
    description: 'Ensures heading levels are in the correct order',
    wcagCriteria: '1.3.1',
    level: 'A',
    category: 'perceptible',
    howToFix: 'Use heading elements (h1-h6) in a logical order. Do not skip heading levels. Each page should have exactly one h1.'
  },
  {
    ruleId: 'keyboard-navigation',
    name: 'Keyboard Navigation',
    description: 'Ensures all interactive elements are accessible via keyboard',
    wcagCriteria: '2.1.1',
    level: 'A',
    category: 'operable',
    howToFix: 'Ensure all interactive elements can be accessed and operated using a keyboard. Add tabindex="0" to custom interactive elements.'
  },
  {
    ruleId: 'focus-visible',
    name: 'Focus Visible',
    description: 'Ensures keyboard focus is visible',
    wcagCriteria: '2.4.7',
    level: 'AA',
    category: 'operable',
    howToFix: 'Provide visible focus indicators for all interactive elements. Use the :focus-visible pseudo-class or outline styles.'
  },
  {
    ruleId: 'aria-roles',
    name: 'ARIA Roles',
    description: 'Ensures ARIA roles are valid and used correctly',
    wcagCriteria: '4.1.2',
    level: 'A',
    category: 'robust',
    howToFix: 'Use valid ARIA roles and ensure required ARIA attributes are present. Check parent/child role relationships.'
  },
  {
    ruleId: 'form-error',
    name: 'Form Error Identification',
    description: 'Ensures form errors are identified and described',
    wcagCriteria: '3.3.1',
    level: 'A',
    category: 'understandable',
    howToFix: 'Associate error messages with form fields using aria-describedby. Make errors visible and clear.'
  },
  {
    ruleId: 'page-title',
    name: 'Page Title',
    description: 'Ensures each page has a descriptive title',
    wcagCriteria: '2.4.2',
    level: 'A',
    category: 'operable',
    howToFix: 'Add a unique, descriptive <title> element to each page. Titles should describe the page content or purpose.'
  },
  {
    ruleId: 'bypass-blocks',
    name: 'Bypass Blocks',
    description: 'Ensures there is a way to skip repeated content blocks',
    wcagCriteria: '2.4.1',
    level: 'A',
    category: 'operable',
    howToFix: 'Add a "skip to main content" link at the beginning of the page, or use proper heading structure and landmarks.'
  },
  {
    ruleId: 'document-lang',
    name: 'Document Language',
    description: 'Ensures the document has a default language',
    wcagCriteria: '3.1.1',
    level: 'A',
    category: 'understandable',
    howToFix: 'Add the lang attribute to the <html> element with the appropriate language code (e.g., lang="en").'
  }
]

async function main() {
  console.log('Seeding database...')

  // Create WCAG rules (reference data)
  for (const rule of wcagRules) {
    await prisma.wcagRule.upsert({
      where: { ruleId: rule.ruleId },
      update: rule,
      create: rule
    })
  }
  console.log('Created WCAG rules')

  // Create default organization for new registrations
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'default-org' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default-org',
      plan: 'agency',
      settings: JSON.stringify({
        theme: 'system',
        notifications: true
      })
    }
  })
  console.log('Created default organization')

  // Create a test user for easy testing
  const hashedPassword = await bcrypt.hash('testpass123', 12)
  
  await prisma.user.upsert({
    where: { email: 'test@accessguard.dev' },
    update: { emailVerifiedAt: new Date() },
    create: {
      email: 'test@accessguard.dev',
      name: 'Test User',
      password: hashedPassword,
      role: 'admin',
      orgId: defaultOrg.id,
      emailVerifiedAt: new Date()
    }
  })
  console.log('Created test user (email: test@accessguard.dev, password: testpass123)')

  // Create demo project + scan history so the dashboard has data to show
  const existingProjects = await prisma.project.count({
    where: { orgId: defaultOrg.id }
  })

  if (existingProjects === 0) {
    const demoProject = await prisma.project.create({
      data: {
        orgId: defaultOrg.id,
        name: 'Demo Website',
        url: 'https://demo.accessguard.dev',
        description: 'Sample project created by the seed script to showcase AccessGuard features.',
        isVerified: true,
        riskScore: 42,
        crawlConfig: JSON.stringify({ maxPages: 100, excludePaths: [], includeSubdomains: false }),
        scanConfig: JSON.stringify({ requestDelay: 500, userAgent: 'default', timeout: 30000, retryCount: 3 })
      }
    })

    const severityCounts = { critical: 1, serious: 3, moderate: 4, minor: 2 }

    const demoScan = await prisma.scan.create({
      data: {
        projectId: demoProject.id,
        status: 'completed',
        startedAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 26 + 1000 * 60 * 2),
        pagesScanned: 12,
        violationsFound: 10,
        summary: JSON.stringify(severityCounts)
      }
    })

    const demoViolations = [
      { ruleId: 'image-alt', wcagCriteria: '1.1.1', severity: 'critical', elementSelector: 'img.hero-banner', elementHtml: '<img class="hero-banner" src="hero.jpg">', description: 'Image element is missing an alt attribute', remediationCode: '<img class="hero-banner" src="hero.jpg" alt="Product overview">' },
      { ruleId: 'color-contrast', wcagCriteria: '1.4.3', severity: 'serious', elementSelector: '.btn-primary', elementHtml: '<button class="btn-primary">Get Started</button>', description: 'Text contrast ratio is below 4.5:1', remediationCode: '<button class="btn-primary" style="color:#ffffff">Get Started</button>' },
      { ruleId: 'label', wcagCriteria: '1.3.1', severity: 'serious', elementSelector: '#newsletter-email', elementHtml: '<input id="newsletter-email" type="email">', description: 'Form element does not have an associated label', remediationCode: '<label for="newsletter-email">Email</label><input id="newsletter-email" type="email">' },
      { ruleId: 'link-name', wcagCriteria: '2.4.4', severity: 'serious', elementSelector: 'a.icon-link', elementHtml: '<a class="icon-link" href="/settings"><svg></svg></a>', description: 'Link text is not discernible', remediationCode: '<a class="icon-link" href="/settings" aria-label="Settings"><svg></svg></a>' },
      { ruleId: 'heading-order', wcagCriteria: '1.3.1', severity: 'moderate', elementSelector: 'h4.feature-title', elementHtml: '<h4 class="feature-title">Feature</h4>', description: 'Heading levels are skipped in the page outline', remediationCode: '<h2 class="feature-title">Feature</h2>' },
      { ruleId: 'focus-visible', wcagCriteria: '2.4.7', severity: 'moderate', elementSelector: 'button.menu-toggle', elementHtml: '<button class="menu-toggle">Menu</button>', description: 'Focus indicator is not visible for this element', remediationCode: '<button class="menu-toggle">Menu</button>' },
      { ruleId: 'document-lang', wcagCriteria: '3.1.1', severity: 'moderate', elementSelector: 'html', elementHtml: '<html>', description: 'Document does not declare a language', remediationCode: '<html lang="en">' },
      { ruleId: 'page-title', wcagCriteria: '2.4.2', severity: 'moderate', elementSelector: 'title', elementHtml: '<title>Home</title>', description: 'Page title is not descriptive', remediationCode: '<title>Acme Corp - Home</title>' },
      { ruleId: 'keyboard-navigation', wcagCriteria: '2.1.1', severity: 'minor', elementSelector: '.carousel', elementHtml: '<div class="carousel">…</div>', description: 'Carousel controls are not keyboard accessible', remediationCode: '<div class="carousel" tabindex="0">…</div>' },
      { ruleId: 'form-error', wcagCriteria: '3.3.1', severity: 'minor', elementSelector: '#contact-form', elementHtml: '<form id="contact-form">…</form>', description: 'Form errors are not described to assistive technology', remediationCode: '<form id="contact-form" aria-describedby="contact-error">…</form>' }
    ]

    await prisma.violation.createMany({
      data: demoViolations.map((v, i) => ({
        scanId: demoScan.id,
        projectId: demoProject.id,
        ruleId: v.ruleId,
        wcagCriteria: v.wcagCriteria,
        severity: v.severity,
        url: 'https://demo.accessguard.dev/',
        elementSelector: v.elementSelector,
        elementHtml: v.elementHtml,
        description: v.description,
        remediationCode: v.remediationCode,
        aiExplanation: 'AI-generated fix applied per WCAG guidelines.',
        aiConfidenceScore: 0.9 - i * 0.02,
        status: i < 4 ? 'open' : i < 8 ? 'open' : 'ignored'
      }))
    })

    await prisma.project.update({
      where: { id: demoProject.id },
      data: { lastScanAt: demoScan.completedAt }
    })

    await prisma.scheduledScan.create({
      data: {
        projectId: demoProject.id,
        frequency: 'weekly',
        cron: '0 2 * * 1',
        nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4)
      }
    })

    await prisma.auditLog.createMany({
      data: [
        { orgId: defaultOrg.id, action: 'scan_completed', metadata: JSON.stringify({ projectName: 'Demo Website', violations: 10 }) },
        { orgId: defaultOrg.id, action: 'project_created', metadata: JSON.stringify({ projectName: 'Demo Website' }) }
      ]
    })

    console.log('Created demo project, scan, 10 violations, weekly schedule, and audit logs')
  } else {
    console.log('Projects already exist for the default org - skipping demo data')
  }

  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
