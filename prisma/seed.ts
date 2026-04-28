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
  await prisma.organization.upsert({
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

  console.log('Database seeding completed!')
  console.log('No demo projects created - users will create their own real projects.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
