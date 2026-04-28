// Browser-based Accessibility Scanner using Puppeteer
// Bypasses bot protection by using a real browser

import puppeteer from 'puppeteer';
import type { Severity } from '@/types';

export interface BrowserViolation {
  ruleId: string;
  wcagCriteria: string;
  severity: Severity;
  url: string;
  elementSelector: string | null;
  elementHtml: string | null;
  description: string;
  remediationCode: string | null;
  aiExplanation: string | null;
  aiConfidenceScore: number | null;
  status: 'open' | 'fixed' | 'ignored' | 'false_positive';
}

interface ScanResult {
  violations: BrowserViolation[];
  pagesScanned: number;
  error?: string;
  screenshot?: string;
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 2000, // 2 seconds
  maxDelay: 10000, // 10 seconds
};

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Random delay to appear more human-like
function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
}

// WCAG Rule implementations
function detectViolationsFromHTML(html: string, url: string): BrowserViolation[] {
  const violations: BrowserViolation[] = [];

  // Rule 1.1.1 - Image Alt
  const imgMatches = html.matchAll(/<img(?![^>]*\balt=)[^>]*>/gi);
  for (const match of imgMatches) {
    const element = match[0];
    violations.push({
      ruleId: 'image-alt',
      wcagCriteria: '1.1.1',
      severity: 'critical',
      url,
      elementSelector: null,
      elementHtml: element.substring(0, 500),
      description: 'Image element missing alt attribute. All images must have alternative text to convey their purpose.',
      remediationCode: element.replace('<img', '<img alt="Descriptive text here"'),
      aiExplanation: 'Added a descriptive alt attribute to the image element.',
      aiConfidenceScore: 0.9,
      status: 'open',
    });
  }

  // Images with generic alt text
  const genericAltMatches = html.matchAll(/<img[^>]*alt="(image|photo|picture|img|icon|graphic)"[^>]*>/gi);
  for (const match of genericAltMatches) {
    const element = match[0];
    violations.push({
      ruleId: 'image-alt',
      wcagCriteria: '1.1.1',
      severity: 'serious',
      url,
      elementSelector: null,
      elementHtml: element.substring(0, 500),
      description: 'Image has generic alt text which doesn\'t describe the content meaningfully.',
      remediationCode: element.replace(/alt="[^"]*"/, 'alt="Specific description of image content"'),
      aiExplanation: 'Replaced generic alt text with more descriptive text.',
      aiConfidenceScore: 0.85,
      status: 'open',
    });
  }

  // Rule 1.3.1 - Form Labels
  const inputMatches = html.matchAll(/<input[^>]*>/gi);
  for (const match of inputMatches) {
    const element = match[0];
    const hasId = /id="[^"]*"/.test(element);
    const hasAriaLabel = /aria-label|aria-labelledby|title/.test(element);
    const isHidden = /type="(hidden|submit|button|image)"/.test(element);

    if (!isHidden && !hasAriaLabel) {
      violations.push({
        ruleId: 'label',
        wcagCriteria: '1.3.1',
        severity: 'serious',
        url,
        elementSelector: null,
        elementHtml: element.substring(0, 500),
        description: 'Form field may be missing associated label. Each form control should have a label for screen reader users.',
        remediationCode: `<label for="input-id" class="sr-only">Label text</label>\n${hasId ? element : element.replace('<input', '<input id="input-id"')}`,
        aiExplanation: 'Added a label element associated with the form field using the for attribute.',
        aiConfidenceScore: 0.95,
        status: 'open',
      });
    }
  }

  // Rule 2.4.4 - Link Purpose (generic link text)
  const genericLinkMatches = html.matchAll(/<a[^>]*>(click here|read more|more|here|learn more|continue|go)<\/a>/gi);
  for (const match of genericLinkMatches) {
    violations.push({
      ruleId: 'link-name',
      wcagCriteria: '2.4.4',
      severity: 'serious',
      url,
      elementSelector: null,
      elementHtml: match[0].substring(0, 500),
      description: `Link text "${match[1]}" is too generic. Link text should describe the destination or purpose.`,
      remediationCode: match[0].replace(match[1], `${match[1]} about this topic`),
      aiExplanation: 'Added context to the link text to describe where the link leads.',
      aiConfidenceScore: 0.87,
      status: 'open',
    });
  }

  // Empty links
  const emptyLinkMatches = html.matchAll(/<a[^>]*>\s*<\/a>/gi);
  for (const match of emptyLinkMatches) {
    violations.push({
      ruleId: 'link-name',
      wcagCriteria: '2.4.4',
      severity: 'critical',
      url,
      elementSelector: null,
      elementHtml: match[0].substring(0, 500),
      description: 'Link has no discernible text. All links must have text that describes their purpose.',
      remediationCode: match[0].replace('></a>', '>Link text</a>'),
      aiExplanation: 'Added descriptive link text.',
      aiConfidenceScore: 0.9,
      status: 'open',
    });
  }

  // Rule 2.1.1 - Keyboard Accessibility (div/span with onclick)
  const clickableMatches = html.matchAll(/<(div|span)[^>]*onclick[^>]*>/gi);
  for (const match of clickableMatches) {
    const element = match[0];
    const hasTabindex = /tabindex="[^"]*"/.test(element);
    if (!hasTabindex) {
      violations.push({
        ruleId: 'keyboard-navigation',
        wcagCriteria: '2.1.1',
        severity: 'critical',
        url,
        elementSelector: null,
        elementHtml: element.substring(0, 500),
        description: `Clickable ${match[1]} element is not keyboard accessible. Use a button element or add tabindex and keyboard event handlers.`,
        remediationCode: match[1] === 'div'
          ? element.replace('<div', '<button type="button"')
          : element + ' tabindex="0"',
        aiExplanation: 'Changed to button element or added tabindex for keyboard accessibility.',
        aiConfidenceScore: 0.92,
        status: 'open',
      });
    }
  }

  // Rule 3.1.1 - Document Language
  if (!/<html[^>]*lang="[^"]*"[^>]*>/i.test(html)) {
    violations.push({
      ruleId: 'document-lang',
      wcagCriteria: '3.1.1',
      severity: 'moderate',
      url,
      elementSelector: 'html',
      elementHtml: '<html>',
      description: 'Document missing language attribute. Screen readers need to know the language to pronounce content correctly.',
      remediationCode: '<html lang="en">',
      aiExplanation: 'Added lang="en" attribute to the html element.',
      aiConfidenceScore: 0.99,
      status: 'open',
    });
  }

  // Rule 2.4.2 - Page Title
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    violations.push({
      ruleId: 'page-title',
      wcagCriteria: '2.4.2',
      severity: 'serious',
      url,
      elementSelector: 'title',
      elementHtml: '<title></title>',
      description: 'Page missing title element. Each page must have a descriptive title.',
      remediationCode: '<title>Page Title | Site Name</title>',
      aiExplanation: 'Added descriptive page title.',
      aiConfidenceScore: 0.98,
      status: 'open',
    });
  }

  // Multiple h1 check
  const h1Matches = html.match(/<h1[^>]*>/gi);
  if (h1Matches && h1Matches.length > 1) {
    violations.push({
      ruleId: 'heading-order',
      wcagCriteria: '1.3.1',
      severity: 'moderate',
      url,
      elementSelector: 'h1',
      elementHtml: `<p>Found ${h1Matches.length} h1 elements</p>`,
      description: `Page has ${h1Matches.length} h1 elements. Each page should have exactly one h1 for proper document structure.`,
      remediationCode: '<!-- Keep only one h1, change others to h2 -->',
      aiExplanation: 'Reduced to single h1 element for proper document outline.',
      aiConfidenceScore: 0.95,
      status: 'open',
    });
  }

  // Invalid ARIA roles
  const validRoles = [
    'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
    'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
    'contentinfo', 'definition', 'dialog', 'directory', 'document',
    'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
    'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
    'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
    'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
    'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
    'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
    'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
  ];

  const roleMatches = html.matchAll(/role="([^"]+)"/gi);
  for (const match of roleMatches) {
    const role = match[1];
    if (!validRoles.includes(role)) {
      violations.push({
        ruleId: 'aria-roles',
        wcagCriteria: '4.1.2',
        severity: 'serious',
        url,
        elementSelector: null,
        elementHtml: `role="${role}"`,
        description: `Invalid ARIA role "${role}". Use valid roles from the WAI-ARIA specification.`,
        remediationCode: `role="region"`,
        aiExplanation: 'Replaced invalid role with a valid ARIA role.',
        aiConfidenceScore: 0.9,
        status: 'open',
      });
    }
  }

  return violations;
}

// Main browser scanner function
export async function scanWithBrowser(
  url: string,
  options: {
    waitForSelector?: string;
    waitTime?: number;
    takeScreenshot?: boolean;
  } = {}
): Promise<ScanResult> {
  let browser = null;
  let retryCount = 0;

  while (retryCount < RETRY_CONFIG.maxRetries) {
    try {
      console.log(`Browser scan attempt ${retryCount + 1} for ${url}`);

      // Launch browser with stealth settings
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--window-size=1920,1080',
        ],
      });

      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Set user agent to appear as a real browser
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Add extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      // Random delay before navigation (appear more human)
      await randomDelay(500, 1500);

      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      if (!response) {
        throw new Error('No response received');
      }

      if (response.status() === 429) {
        throw new Error('HTTP 429: Too Many Requests');
      }

      if (response.status() === 403) {
        throw new Error('HTTP 403: Forbidden');
      }

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText}`);
      }

      // Wait for custom selector or default time
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      } else if (options.waitTime) {
        await delay(options.waitTime);
      } else {
        // Wait for page to be fully loaded
        await delay(2000);
      }

      // Get the page content
      const html = await page.content();

      // Take screenshot if requested
      let screenshot: string | undefined;
      if (options.takeScreenshot) {
        screenshot = await page.screenshot({ encoding: 'base64', fullPage: false }) as string;
      }

      await browser.close();
      browser = null;

      // Analyze the HTML for violations
      const violations = detectViolationsFromHTML(html, url);

      console.log(`Browser scan found ${violations.length} violations on ${url}`);

      return {
        violations,
        pagesScanned: 1,
        screenshot,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Browser scan attempt ${retryCount + 1} failed: ${errorMsg}`);

      // Close browser if still open
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore close errors
        }
        browser = null;
      }

      // Check if we should retry
      if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        retryCount++;
        if (retryCount < RETRY_CONFIG.maxRetries) {
          const delayMs = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
            RETRY_CONFIG.maxDelay
          );
          console.log(`Retrying in ${delayMs}ms...`);
          await delay(delayMs);
          continue;
        }
        return {
          violations: [],
          pagesScanned: 0,
          error: 'The target website is rate limiting requests. Please try again later or use the manual HTML upload option.',
        };
      }

      if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        return {
          violations: [],
          pagesScanned: 0,
          error: 'The target website blocked the scan. Please try the manual HTML upload option to scan protected pages.',
        };
      }

      // For other errors, don't retry
      return {
        violations: [],
        pagesScanned: 0,
        error: `Failed to scan: ${errorMsg}`,
      };
    }
  }

  return {
    violations: [],
    pagesScanned: 0,
    error: 'Maximum retry attempts reached. The website may have bot protection.',
  };
}

// Scan from raw HTML (for manual upload)
export function scanFromHTML(html: string, url: string): ScanResult {
  const violations = detectViolationsFromHTML(html, url);
  return {
    violations,
    pagesScanned: 1,
  };
}
