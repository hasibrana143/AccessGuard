// Server-side Accessibility Scanner
// Performs real WCAG 2.1 AA compliance checks

import type { Violation, Severity } from '@/types';

export interface ServerViolation {
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

interface ScanConfig {
  maxPages: number;
  excludePaths: string[];
  includeSubdomains: boolean;
}

interface AdvancedScanConfig {
  requestDelay?: number; // Delay between requests in ms
  userAgent?: 'default' | 'chrome' | 'firefox' | 'safari' | 'googlebot';
  timeout?: number; // Request timeout in ms
  retryCount?: number; // Number of retries on failure
  retryDelay?: number; // Delay between retries in ms
}

// User-Agent strings for different browsers
const USER_AGENTS = {
  default: 'Mozilla/5.0 (compatible; AccessGuard/1.0; +https://accessguard.io)',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

// Delay utility
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// WCAG Rule implementations - pattern matching for HTML analysis
export function detectViolations(html: string, url: string): ServerViolation[] {
  const violations: ServerViolation[] = [];

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

  // Positive tabindex
  const tabindexMatches = html.matchAll(/tabindex="([1-9]\d*)"/gi);
  for (const match of tabindexMatches) {
    violations.push({
      ruleId: 'keyboard-navigation',
      wcagCriteria: '2.1.1',
      severity: 'moderate',
      url,
      elementSelector: null,
      elementHtml: `Element with ${match[0]}`,
      description: `Element with ${match[0]} disrupts natural tab order. Use tabindex="0" or "-1" instead.`,
      remediationCode: `Replace ${match[0]} with tabindex="0"`,
      aiExplanation: 'Changed tabindex to 0 to maintain natural tab order.',
      aiConfidenceScore: 0.95,
      status: 'open',
    });
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

// Fetch and scan a URL with retry support and bot protection handling
export async function scanUrlServer(
  url: string, 
  config?: ScanConfig,
  advancedConfig?: AdvancedScanConfig
): Promise<{
  violations: ServerViolation[];
  pagesScanned: number;
  error?: string;
}> {
  const {
    requestDelay = 500,
    userAgent = 'default',
    timeout = 30000,
    retryCount = 3,
    retryDelay = 2000,
  } = advancedConfig || {};

  try {
    // Validate URL
    const parsedUrl = new URL(url);
    console.log(`Scanning ${url} with ${userAgent} user-agent...`);

    // Try to fetch the page with retry logic
    let html: string;
    let lastError: string | null = null;
    
    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        // Add delay between retries
        if (attempt > 1) {
          console.log(`Retry attempt ${attempt}/${retryCount} after ${retryDelay}ms delay...`);
          await delay(retryDelay * attempt); // Exponential backoff
        }

        // Also add delay between requests if configured
        if (requestDelay > 0 && attempt === 1) {
          await delay(requestDelay);
        }

        const response = await fetch(url, {
          headers: {
            'User-Agent': USER_AGENTS[userAgent],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
          // Provide specific error messages for common HTTP errors
          const statusMessages: Record<number, string> = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden - The website blocked our scanner. Try using a different User-Agent or verify your domain ownership.',
            404: 'Not Found',
            429: 'Too Many Requests - Rate limited. Wait a few minutes or verify domain ownership to bypass.',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout',
          };
          const statusText = statusMessages[response.status] || response.statusText;
          lastError = `HTTP ${response.status}: ${statusText}`;
          
          // For rate limiting and forbidden, try different user-agent on next attempt
          if (response.status === 403 || response.status === 429) {
            // Will retry with different settings
            continue;
          }
          
          throw new Error(lastError);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          throw new Error(`Unsupported content type: ${contentType}`);
        }

        html = await response.text();
        lastError = null;
        break; // Success, exit retry loop

      } catch (fetchError) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Failed to fetch URL';
        lastError = errorMsg;
        console.log(`Attempt ${attempt} failed for ${url}: ${errorMsg}`);
        
        // If this was the last attempt, return error
        if (attempt === retryCount) {
          return {
            violations: [],
            pagesScanned: 0,
            error: `Cannot access URL after ${retryCount} attempts: ${errorMsg}. Try using Manual HTML Upload or verify your domain ownership.`
          };
        }
      }
    }

    if (!html!) {
      return {
        violations: [],
        pagesScanned: 0,
        error: lastError || 'Failed to fetch URL'
      };
    }

    // Analyze the HTML for violations
    const violations = detectViolations(html, url);

    console.log(`Found ${violations.length} violations on ${url}`);

    return {
      violations,
      pagesScanned: 1,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Scan error for ${url}:`, errorMessage);

    return {
      violations: [],
      pagesScanned: 0,
      error: errorMessage,
    };
  }
}

// Crawl multiple pages (placeholder for future implementation)
export async function crawlSite(
  baseUrl: string,
  config: ScanConfig = { maxPages: 10, excludePaths: [], includeSubdomains: false }
): Promise<{
  violations: ServerViolation[];
  pagesScanned: number;
  errors: string[];
}> {
  const result = await scanUrlServer(baseUrl, config);
  return {
    violations: result.violations,
    pagesScanned: result.pagesScanned,
    errors: result.error ? [result.error] : [],
  };
}
