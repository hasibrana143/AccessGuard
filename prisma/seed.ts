import { PrismaClient } from '@prisma/client'

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

  // Create WCAG rules
  for (const rule of wcagRules) {
    await prisma.wcagRule.upsert({
      where: { ruleId: rule.ruleId },
      update: rule,
      create: rule
    })
  }
  console.log('Created WCAG rules')

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
      plan: 'agency',
      settings: JSON.stringify({
        theme: 'dark',
        notifications: true
      })
    }
  })
  console.log('Created demo organization')

  // Create demo user
  await prisma.user.upsert({
    where: { email: 'demo@accessguard.com' },
    update: {},
    create: {
      email: 'demo@accessguard.com',
      name: 'Demo User',
      role: 'admin',
      orgId: org.id,
      password: '965567bb78d7be40e7060376387e76633560b4e73f4a37d46f7cafb6f73cdcf6' // demo123 (SHA-256)
    }
  })
  console.log('Created demo user')

  // Create demo projects
  const project1 = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      name: 'E-Commerce Store',
      url: 'https://shop.example.com',
      description: 'Main e-commerce platform',
      orgId: org.id,
      riskScore: 72,
      crawlConfig: JSON.stringify({
        maxPages: 100,
        excludePaths: ['/admin/*', '/api/*'],
        includeSubdomains: false
      })
    }
  })

  const project2 = await prisma.project.upsert({
    where: { id: 'demo-project-2' },
    update: {},
    create: {
      id: 'demo-project-2',
      name: 'Marketing Website',
      url: 'https://marketing.example.com',
      description: 'Company marketing site',
      orgId: org.id,
      riskScore: 85,
      crawlConfig: JSON.stringify({
        maxPages: 50,
        excludePaths: [],
        includeSubdomains: true
      })
    }
  })
  console.log('Created demo projects')

  // Create demo scans with historical data
  const now = new Date()
  const scans = []
  
  // Create scans for the last 30 days
  for (let day = 0; day < 30; day++) {
    const scanDate = new Date(now.getTime() - day * 86400000) // 86400000 = 1 day in ms
    
    // Scan for project 1 every 3 days
    if (day % 3 === 0) {
      const criticalCount = Math.max(1, 5 - Math.floor(day / 5))
      const seriousCount = Math.max(2, 8 - Math.floor(day / 4))
      const moderateCount = Math.max(1, 6 - Math.floor(day / 6))
      const minorCount = Math.max(0, 4 - Math.floor(day / 7))
      
      const scan = await prisma.scan.create({
        data: {
          projectId: project1.id,
          status: 'completed',
          startedAt: new Date(scanDate.getTime() - 1800000),
          completedAt: scanDate,
          pagesScanned: 40 + Math.floor(Math.random() * 20),
          violationsFound: criticalCount + seriousCount + moderateCount + minorCount,
          summary: JSON.stringify({
            critical: criticalCount,
            serious: seriousCount,
            moderate: moderateCount,
            minor: minorCount
          }),
          createdAt: scanDate
        }
      })
      scans.push({ scan, project: project1, day })
    }
    
    // Scan for project 2 every 5 days
    if (day % 5 === 0) {
      const criticalCount = Math.max(0, 2 - Math.floor(day / 10))
      const seriousCount = Math.max(1, 4 - Math.floor(day / 7))
      const moderateCount = Math.max(1, 4 - Math.floor(day / 8))
      const minorCount = Math.max(0, 2 - Math.floor(day / 10))
      
      const scan = await prisma.scan.create({
        data: {
          projectId: project2.id,
          status: 'completed',
          startedAt: new Date(scanDate.getTime() - 1800000),
          completedAt: scanDate,
          pagesScanned: 25 + Math.floor(Math.random() * 15),
          violationsFound: criticalCount + seriousCount + moderateCount + minorCount,
          summary: JSON.stringify({
            critical: criticalCount,
            serious: seriousCount,
            moderate: moderateCount,
            minor: minorCount
          }),
          createdAt: scanDate
        }
      })
      scans.push({ scan, project: project2, day })
    }
  }
  
  // Create a running scan for demo
  await prisma.scan.create({
    data: {
      projectId: project1.id,
      status: 'running',
      startedAt: new Date(now.getTime() - 600000),
      pagesScanned: 12,
      violationsFound: 0
    }
  })
  
  console.log('Created demo scans with historical data')

  // Create demo violations from the most recent scans
  const latestScan1 = scans.find(s => s.project.id === project1.id && s.day === 0)
  const latestScan2 = scans.find(s => s.project.id === project2.id && s.day === 0)
  
  const violations = [
    {
      scanId: latestScan1?.scan.id || scans[0].scan.id,
      projectId: project1.id,
      ruleId: 'color-contrast',
      wcagCriteria: '1.4.3',
      severity: 'critical',
      url: 'https://shop.example.com/checkout',
      elementSelector: '.checkout-btn',
      elementHtml: '<button class="checkout-btn" style="background: #ff6b6b; color: #fff;">Checkout</button>',
      description: 'Insufficient color contrast ratio of 2.8:1. Text must have a contrast ratio of at least 4.5:1 against its background.',
      remediationCode: '<button class="checkout-btn" style="background: #d63031; color: #fff;">Checkout</button>',
      aiExplanation: 'Changed the background color from #ff6b6b to #d63031, which provides a contrast ratio of 4.6:1 against white text, meeting WCAG AA requirements.',
      aiConfidenceScore: 0.95
    },
    {
      scanId: latestScan1?.scan.id || scans[0].scan.id,
      projectId: project1.id,
      ruleId: 'image-alt',
      wcagCriteria: '1.1.1',
      severity: 'critical',
      url: 'https://shop.example.com/products/123',
      elementSelector: '.product-image img',
      elementHtml: '<img src="/products/shoe.jpg" class="product-img">',
      description: 'Image element missing alt attribute. All images must have alternative text to convey their purpose.',
      remediationCode: '<img src="/products/shoe.jpg" class="product-img" alt="Red running shoes on white background">',
      aiExplanation: 'Added a descriptive alt attribute that describes the image content. This helps screen reader users understand the product image.',
      aiConfidenceScore: 0.89
    },
    {
      scanId: latestScan1?.scan.id || scans[0].scan.id,
      projectId: project1.id,
      ruleId: 'label',
      wcagCriteria: '1.3.1',
      severity: 'serious',
      url: 'https://shop.example.com/contact',
      elementSelector: '#newsletter-email',
      elementHtml: '<input type="email" id="newsletter-email" placeholder="Enter email">',
      description: 'Form field missing associated label. Each form control must have a label for screen reader users.',
      remediationCode: '<label for="newsletter-email" class="sr-only">Email address</label>\n<input type="email" id="newsletter-email" placeholder="Enter email">',
      aiExplanation: 'Added a label element with the for attribute matching the input id. Used sr-only class to hide visually while keeping it accessible to screen readers.',
      aiConfidenceScore: 0.97
    },
    {
      scanId: latestScan1?.scan.id || scans[0].scan.id,
      projectId: project1.id,
      ruleId: 'link-name',
      wcagCriteria: '2.4.4',
      severity: 'serious',
      url: 'https://shop.example.com/blog',
      elementSelector: '.read-more-link',
      elementHtml: '<a href="/blog/post-1" class="read-more-link">Read more</a>',
      description: 'Link text is too generic. Link text should describe the destination or purpose of the link.',
      remediationCode: '<a href="/blog/post-1" class="read-more-link">Read more about Summer Sale Deals</a>',
      aiExplanation: 'Made the link text more descriptive by including context about what the user will read. This helps all users, especially screen reader users who may navigate by links.',
      aiConfidenceScore: 0.91
    },
    {
      scanId: latestScan1?.scan.id || scans[0].scan.id,
      projectId: project1.id,
      ruleId: 'heading-order',
      wcagCriteria: '1.3.1',
      severity: 'moderate',
      url: 'https://shop.example.com/about',
      elementSelector: '.about-section h3',
      elementHtml: '<h3>Our Story</h3>',
      description: 'Heading level skipped from h1 to h3. Heading levels should not skip to maintain document structure.',
      remediationCode: '<h2>Our Story</h2>',
      aiExplanation: 'Changed h3 to h2 to maintain proper heading hierarchy. The previous heading was h1, so the next should be h2.',
      aiConfidenceScore: 0.88
    },
    {
      scanId: latestScan1?.scan.id || scans[0].scan.id,
      projectId: project1.id,
      ruleId: 'keyboard-navigation',
      wcagCriteria: '2.1.1',
      severity: 'critical',
      url: 'https://shop.example.com/products',
      elementSelector: '.quick-view-btn',
      elementHtml: '<div class="quick-view-btn" onclick="openQuickView(123)">Quick View</div>',
      description: 'Clickable element is not keyboard accessible. Use a button element or add keyboard event handlers.',
      remediationCode: '<button class="quick-view-btn" type="button" onclick="openQuickView(123)">Quick View</button>',
      aiExplanation: 'Changed div to button element, which is natively keyboard accessible. The button element can receive focus and be activated with Enter or Space keys.',
      aiConfidenceScore: 0.96
    },
    {
      scanId: latestScan1?.scan.id || scans[0].scan.id,
      projectId: project1.id,
      ruleId: 'focus-visible',
      wcagCriteria: '2.4.7',
      severity: 'serious',
      url: 'https://shop.example.com/search',
      elementSelector: '.search-input',
      elementHtml: '<input type="search" class="search-input" placeholder="Search...">',
      description: 'Element has no visible focus indicator. Focus states help keyboard users know which element is active.',
      remediationCode: '<style>\n.search-input:focus {\n  outline: 2px solid #10b981;\n  outline-offset: 2px;\n}\n</style>\n<input type="search" class="search-input" placeholder="Search...">',
      aiExplanation: 'Added CSS to display a visible focus indicator when the search input receives keyboard focus. The green outline provides clear visual feedback.',
      aiConfidenceScore: 0.94
    },
    {
      scanId: latestScan1?.scan.id || scans[0].scan.id,
      projectId: project1.id,
      ruleId: 'aria-roles',
      wcagCriteria: '4.1.2',
      severity: 'serious',
      url: 'https://shop.example.com/menu',
      elementSelector: '.nav-dropdown',
      elementHtml: '<div class="nav-dropdown" role="menu">',
      description: 'Element with role="menu" has no accessible name. Menus must have a label for screen reader users.',
      remediationCode: '<div class="nav-dropdown" role="menu" aria-label="Main navigation menu">',
      aiExplanation: 'Added aria-label attribute to provide an accessible name for the menu. This helps screen reader users understand the purpose of the menu.',
      aiConfidenceScore: 0.92
    },
    {
      scanId: latestScan2?.scan.id || scans.find(s => s.project.id === project2.id)?.scan.id || scans[0].scan.id,
      projectId: project2.id,
      ruleId: 'image-alt',
      wcagCriteria: '1.1.1',
      severity: 'critical',
      url: 'https://marketing.example.com/hero',
      elementSelector: '.hero-bg img',
      elementHtml: '<img src="/images/hero-bg.jpg" class="hero-bg">',
      description: 'Decorative image should have empty alt attribute. Background images that are purely decorative should be marked as such.',
      remediationCode: '<img src="/images/hero-bg.jpg" class="hero-bg" alt="">',
      aiExplanation: 'Added alt="" to indicate this is a decorative image. Screen readers will skip this image entirely, which is appropriate for background/hero images.',
      aiConfidenceScore: 0.93
    },
    {
      scanId: latestScan2?.scan.id || scans.find(s => s.project.id === project2.id)?.scan.id || scans[0].scan.id,
      projectId: project2.id,
      ruleId: 'color-contrast',
      wcagCriteria: '1.4.3',
      severity: 'serious',
      url: 'https://marketing.example.com/pricing',
      elementSelector: '.price-label',
      elementHtml: '<span class="price-label" style="color: #a0a0a0;">$99/mo</span>',
      description: 'Insufficient color contrast ratio of 3.2:1. Text must have a contrast ratio of at least 4.5:1.',
      remediationCode: '<span class="price-label" style="color: #6b7280;">$99/mo</span>',
      aiExplanation: 'Changed text color from #a0a0a0 to #6b7280, which provides a contrast ratio of 4.7:1 against white background.',
      aiConfidenceScore: 0.91
    },
    {
      scanId: latestScan2?.scan.id || scans.find(s => s.project.id === project2.id)?.scan.id || scans[0].scan.id,
      projectId: project2.id,
      ruleId: 'page-title',
      wcagCriteria: '2.4.2',
      severity: 'moderate',
      url: 'https://marketing.example.com/contact',
      elementSelector: 'title',
      elementHtml: '<title>Contact</title>',
      description: 'Page title is too generic. Include the site name to help users identify the page.',
      remediationCode: '<title>Contact Us | Marketing Site</title>',
      aiExplanation: 'Updated the page title to include both the page name and site name, making it more useful for users navigating between tabs or using screen readers.',
      aiConfidenceScore: 0.89
    },
    {
      scanId: latestScan2?.scan.id || scans.find(s => s.project.id === project2.id)?.scan.id || scans[0].scan.id,
      projectId: project2.id,
      ruleId: 'document-lang',
      wcagCriteria: '3.1.1',
      severity: 'moderate',
      url: 'https://marketing.example.com',
      elementSelector: 'html',
      elementHtml: '<html>',
      description: 'Document missing language attribute. Screen readers need to know the language to pronounce content correctly.',
      remediationCode: '<html lang="en">',
      aiExplanation: 'Added lang="en" attribute to the html element. This tells screen readers to use English pronunciation rules.',
      aiConfidenceScore: 0.99
    }
  ]

  for (const violation of violations) {
    await prisma.violation.create({ data: violation })
  }
  
  // Add some historical violations for trend data
  for (const scanData of scans) {
    // Add violations for older scans (these are "fixed" from previous scans)
    const violationCount = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < violationCount; i++) {
      const severities = ['critical', 'serious', 'moderate', 'minor']
      const rules = ['color-contrast', 'image-alt', 'label', 'link-name', 'heading-order']
      await prisma.violation.create({
        data: {
          scanId: scanData.scan.id,
          projectId: scanData.project.id,
          ruleId: rules[Math.floor(Math.random() * rules.length)],
          wcagCriteria: '1.4.3',
          severity: severities[Math.floor(Math.random() * severities.length)] as 'critical' | 'serious' | 'moderate' | 'minor',
          url: `https://${scanData.project.id === project1.id ? 'shop' : 'marketing'}.example.com/page-${i}`,
          elementSelector: `.element-${i}`,
          elementHtml: `<div class="element-${i}">Content</div>`,
          description: 'Historical violation from previous scan',
          status: scanData.day > 3 ? 'fixed' : 'open',
          fixedAt: scanData.day > 3 ? scanData.scan.completedAt : null,
          createdAt: scanData.scan.completedAt || new Date()
        }
      })
    }
  }
  
  console.log('Created demo violations with historical data')

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
