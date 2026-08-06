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
