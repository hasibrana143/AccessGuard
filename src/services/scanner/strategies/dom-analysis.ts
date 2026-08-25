import type { ScannerStrategy, ScanResult, ScannerViolation } from '../types';

const VALID_ROLES = [
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
  'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
];

const GENERIC_ALT = ['image', 'photo', 'picture', 'img', 'icon', 'graphic'];
const GENERIC_LINKS = ['click here', 'read more', 'more', 'here', 'learn more', 'continue', 'go'];

function detectViolations(html: string, url: string): ScannerViolation[] {
  const violations: ScannerViolation[] = [];

  const imgMatches = html.matchAll(/<img(?![^>]*\balt=)[^>]*>/gi);
  for (const match of imgMatches) {
    violations.push({
      ruleId: 'image-alt', wcagCriteria: '1.1.1', severity: 'critical',
      url, elementSelector: null, elementHtml: match[0].substring(0, 500),
      description: 'Image element missing alt attribute.',
      remediationCode: match[0].replace('<img', '<img alt="Descriptive text here"'),
      aiExplanation: 'Added descriptive alt attribute.', aiConfidenceScore: null, status: 'open',
    });
  }

  const genericAlt = html.matchAll(/<img[^>]*alt="(image|photo|picture|img|icon|graphic)"[^>]*>/gi);
  for (const match of genericAlt) {
    violations.push({
      ruleId: 'image-alt', wcagCriteria: '1.1.1', severity: 'serious',
      url, elementSelector: null, elementHtml: match[0].substring(0, 500),
      description: 'Image has generic alt text.',
      remediationCode: match[0].replace(/alt="[^"]*"/, 'alt="Specific description"'),
      aiExplanation: 'Replaced generic alt text.', aiConfidenceScore: null, status: 'open',
    });
  }

  const inputMatches = html.matchAll(/<input[^>]*>/gi);
  for (const match of inputMatches) {
    const el = match[0];
    if (/type="(hidden|submit|button|image)"/.test(el)) continue;
    if (/aria-label|aria-labelledby|title/.test(el)) continue;
    violations.push({
      ruleId: 'label', wcagCriteria: '1.3.1', severity: 'serious',
      url, elementSelector: null, elementHtml: el.substring(0, 500),
      description: 'Form field may be missing associated label.',
      remediationCode: `<label for="input-id" class="sr-only">Label</label>\n${el.replace('<input', '<input id="input-id"')}`,
      aiExplanation: 'Added label element.', aiConfidenceScore: null, status: 'open',
    });
  }

  const genericLinks = html.matchAll(/<a[^>]*>(click here|read more|more|here|learn more|continue|go)<\/a>/gi);
  for (const match of genericLinks) {
    violations.push({
      ruleId: 'link-name', wcagCriteria: '2.4.4', severity: 'serious',
      url, elementSelector: null, elementHtml: match[0].substring(0, 500),
      description: `Generic link text "${match[1]}".`,
      remediationCode: match[0].replace(match[1], `${match[1]} about this topic`),
      aiExplanation: 'Added context to link text.', aiConfidenceScore: null, status: 'open',
    });
  }

  if (!/<html[^>]*lang="[^"]*"[^>]*>/i.test(html)) {
    violations.push({
      ruleId: 'document-lang', wcagCriteria: '3.1.1', severity: 'moderate',
      url, elementSelector: 'html', elementHtml: '<html>',
      description: 'Document missing language attribute.',
      remediationCode: '<html lang="en">',
      aiExplanation: 'Added lang="en" attribute.', aiConfidenceScore: null, status: 'open',
    });
  }

  if (!/<title>[^<]+<\/title>/i.test(html)) {
    violations.push({
      ruleId: 'page-title', wcagCriteria: '2.4.2', severity: 'serious',
      url, elementSelector: 'title', elementHtml: '<title></title>',
      description: 'Page missing title element.',
      remediationCode: '<title>Page Title | Site Name</title>',
      aiExplanation: 'Added page title.', aiConfidenceScore: null, status: 'open',
    });
  }

  const roleMatches = html.matchAll(/role="([^"]+)"/gi);
  for (const match of roleMatches) {
    if (!VALID_ROLES.includes(match[1])) {
      violations.push({
        ruleId: 'aria-roles', wcagCriteria: '4.1.2', severity: 'serious',
        url, elementSelector: null, elementHtml: `role="${match[1]}"`,
        description: `Invalid ARIA role "${match[1]}".`,
        remediationCode: 'role="region"',
        aiExplanation: 'Replaced invalid role.', aiConfidenceScore: null, status: 'open',
      });
    }
  }

  // Check for button-name violations (buttons without text content)
  const buttonMatches = html.matchAll(/<button[^>]*>([^<]*)<\/button>/gi);
  for (const match of buttonMatches) {
    const content = match[1].trim();
    const tag = match[0];
    if (!content && !/aria-label|aria-labelledby/.test(tag)) {
      violations.push({
        ruleId: 'button-name', wcagCriteria: '4.1.2', severity: 'serious',
        url, elementSelector: null, elementHtml: tag.substring(0, 500),
        description: 'Button has no accessible name.',
        remediationCode: tag.replace('<button', '<button aria-label="Action"'),
        aiExplanation: 'Added aria-label to empty button.', aiConfidenceScore: null, status: 'open',
      });
    }
  }

  // Check for meta viewport blocking zoom
  if (/user-scalable=no|maximum-scale=1\.0/i.test(html)) {
    violations.push({
      ruleId: 'meta-viewport', wcagCriteria: 'Best Practice', severity: 'serious',
      url, elementSelector: 'meta[name="viewport"]', elementHtml: 'user-scalable=no',
      description: 'Viewport meta tag blocks user scaling.',
      remediationCode: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      aiExplanation: 'Removed zoom-blocking attributes.', aiConfidenceScore: null, status: 'open',
    });
  }

  // Check for landmark regions
  const hasMain = /<main[\s>]/i.test(html);
  const hasNav = /<nav[\s>]/i.test(html);
  if (!hasMain && html.length > 5000) {
    violations.push({
      ruleId: 'region', wcagCriteria: 'Best Practice', severity: 'moderate',
      url, elementSelector: null, elementHtml: 'No <main> landmark found',
      description: 'Page lacks a main landmark region.',
      remediationCode: '<main>\n  <!-- Page content -->\n</main>',
      aiExplanation: 'Wrap primary content in <main> landmark.', aiConfidenceScore: null, status: 'open',
    });
  }
  if (!hasNav && html.length > 10000) {
    violations.push({
      ruleId: 'landmark-navigation', wcagCriteria: 'Best Practice', severity: 'minor',
      url, elementSelector: null, elementHtml: 'No <nav> landmark found',
      description: 'Page lacks a navigation landmark region.',
      remediationCode: '<nav aria-label="Main navigation">\n  <!-- Navigation links -->\n</nav>',
      aiExplanation: 'Add <nav> landmark for navigation.', aiConfidenceScore: null, status: 'open',
    });
  }

  // Check for list structure (li without ul/ol)
  const liCount = (html.match(/<li[\s>]/gi) || []).length;
  const ulCount = (html.match(/<ul[\s>]/gi) || []).length;
  const olCount = (html.match(/<ol[\s>]/gi) || []).length;
  if (liCount > 0 && ulCount + olCount === 0) {
    violations.push({
      ruleId: 'listitem', wcagCriteria: '1.3.1', severity: 'serious',
      url, elementSelector: null, elementHtml: `Found ${liCount} <li> elements without <ul>/<ol>`,
      description: 'List items found without a parent list element.',
      remediationCode: '<ul>\n  <!-- list items -->\n</ul>',
      aiExplanation: 'Wrap <li> elements in <ul> or <ol>.', aiConfidenceScore: null, status: 'open',
    });
  }

  // Check for empty links
  const emptyLinks = html.matchAll(/<a[^>]*>\s*<\/a>/gi);
  for (const match of emptyLinks) {
    const tag = match[0];
    if (!/aria-label|aria-labelledby|title/.test(tag)) {
      violations.push({
        ruleId: 'link-name', wcagCriteria: '2.4.4', severity: 'serious',
        url, elementSelector: null, elementHtml: tag.substring(0, 500),
        description: 'Link has no accessible name.',
        remediationCode: tag.replace('<a', '<a aria-label="Link description"'),
        aiExplanation: 'Added aria-label to empty link.', aiConfidenceScore: null, status: 'open',
      });
    }
  }

  return violations;
}

export const domAnalysisStrategy: ScannerStrategy = {
  name: 'dom-analysis',
  canHandle(_url: string) {
    return true;
  },
  async scan(_url: string, html: string | null, _config): Promise<ScanResult> {
    if (!html) {
      return { violations: [], pagesScanned: 0, error: 'No HTML provided for DOM analysis' };
    }
    const violations = detectViolations(html, _url);
    return { violations, pagesScanned: 1 };
  },
};
