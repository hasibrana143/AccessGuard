import type { ScannerStrategy, ScanResult, ScannerViolation, ScanConfig } from '../types';

const VIOLATION_PATTERNS: Array<{
  ruleId: string; wcagCriteria: string; severity: ScannerViolation['severity']; label: string;
  pattern: RegExp; labelPattern?: RegExp;
  check: (html: string) => { elementHtml: string; description: string; remediationCode: string; aiExplanation: string } | null;
}> = [
  {
    ruleId: 'page-title', wcagCriteria: '2.4.2', severity: 'serious', label: 'Page Title',
    pattern: /<title>/i,
    check: (html: string) => {
      if (!/<title>[^<]+<\/title>/i.test(html)) {
        const hasTitle = /<title>/i.test(html);
        return {
          elementHtml: `<title>${hasTitle ? 'empty' : 'missing'}</title>`,
          description: 'Page is missing a descriptive title.',
          remediationCode: '<title>Page Name | Site Name</title>',
          aiExplanation: 'Add a descriptive title element.',
        };
      }
      return null;
    },
  },
  {
    ruleId: 'document-lang', wcagCriteria: '3.1.1', severity: 'moderate', label: 'Document Language',
    pattern: /<html/i, labelPattern: /lang="[^"]+"/i,
    check: (html: string) => {
      const htmlTag = html.match(/<html[^>]*>/i)?.[0] || '';
      if (!/lang/i.test(htmlTag)) {
        return {
          elementHtml: htmlTag,
          description: 'The html element does not have a lang attribute.',
          remediationCode: '<html lang="en">',
          aiExplanation: 'Add lang="en" to the html element.',
        };
      }
      return null;
    },
  },
  {
    ruleId: 'image-alt', wcagCriteria: '1.1.1', severity: 'critical', label: 'Image Alt Attributes',
    pattern: /<img[^>]*>/gi, labelPattern: /alt="[^"]*"/i,
    check: (html: string) => {
      const imgs = html.match(/<img[^>]*>/gi) || [];
      for (const img of imgs) {
        if (!/alt=/i.test(img)) {
          return {
            elementHtml: img.substring(0, 500),
            description: 'Image missing alt attribute.',
            remediationCode: img.replace(/<img/i, '<img alt="Descriptive text"'),
            aiExplanation: 'Add meaningful alt text.',
          };
        }
      }
      return null;
    },
  },
  {
    ruleId: 'heading-order', wcagCriteria: '1.3.1', severity: 'serious', label: 'Heading Order',
    pattern: /<h[1-6][^>]*>/gi,
    check: (html: string) => {
      const headings = html.match(/<h([1-6])[^>]*>/gi) || [];
      let lastLevel = 0;
      for (const h of headings) {
        const level = parseInt(h.match(/<h([1-6])/i)?.[1] || '0');
        if (lastLevel > 0 && level > lastLevel + 1) {
          return {
            elementHtml: h,
            description: `Heading order jumps from h${lastLevel} to h${level}.`,
            remediationCode: h.replace(`h${level}`, `h${lastLevel + 1}`),
            aiExplanation: `Change h${level} to h${lastLevel + 1}.`,
          };
        }
        lastLevel = level;
      }
      return null;
    },
  },
  {
    ruleId: 'aria-roles', wcagCriteria: '4.1.2', severity: 'serious', label: 'Invalid ARIA Roles',
    pattern: /role="[^"]+"/gi,
    check: (html: string) => {
      const validRoles = ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'region', 'form',
        'alert', 'dialog', 'button', 'link', 'list', 'listitem', 'tab', 'tabpanel', 'tablist',
      ];
      const roles = html.match(/role="([^"]+)"/gi) || [];
      for (const role of roles) {
        const value = role.match(/role="([^"]+)"/i)?.[1];
        if (value && !validRoles.includes(value)) {
          return {
            elementHtml: role,
            description: `Possibly invalid ARIA role "${value}".`,
            remediationCode: '',
            aiExplanation: `Verify "${value}" is a valid ARIA role.`,
          };
        }
      }
      return null;
    },
  },
  {
    ruleId: 'general-color-contrast', wcagCriteria: '1.4.3', severity: 'moderate', label: 'Color Contrast',
    pattern: /color\s*:\s*#/gi,
    check: () => {
      return null;
    },
  },
  {
    ruleId: 'meta-viewport', wcagCriteria: '1.4.4', severity: 'minor', label: 'Meta Viewport',
    pattern: /<meta[^>]*name="viewport"[^>]*>/i,
    check: (html: string) => {
      const meta = html.match(/<meta[^>]*name="viewport"[^>]*>/i)?.[0];
      if (meta && /user-scalable=no|maximum-scale=1(\.0)?/i.test(meta)) {
        return {
          elementHtml: meta,
          description: 'Viewport meta tag restricts zoom.',
          remediationCode: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
          aiExplanation: 'Remove user-scalable=no and maximum-scale restrictions.',
        };
      }
      return null;
    },
  },
];

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AccessGuard-Scanner/1.0' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function extractBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}

function extractUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const linkPatterns = [
    /<a[^>]*href="([^"]+)"[^>]*>/gi,
    /<a[^>]*href='([^']+)'[^>]*>/gi,
  ];

  for (const pattern of linkPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      try {
        const href = match[1].split('#')[0].split('?')[0];
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
        const absolute = new URL(href, baseUrl).href;
        if (absolute.startsWith(baseUrl) && !urls.includes(absolute)) {
          urls.push(absolute);
        }
      } catch {
        continue;
      }
    }
  }

  return urls.slice(0, 20);
}

export const fetchAnalysisStrategy: ScannerStrategy = {
  name: 'fetch-analysis',
  canHandle(url: string) {
    return url.startsWith('http://') || url.startsWith('https://');
  },
  async scan(url: string, html: string | null, config?: ScanConfig): Promise<ScanResult> {
    try {
      const documentHtml = html ?? await fetchHtml(url);
      const baseUrl = extractBaseUrl(url);
      const linkedUrls = extractUrls(documentHtml, baseUrl);
      const maxPages = config?.maxPages ?? 10;
      const urlsToScan = [url, ...linkedUrls].slice(0, maxPages);

      const allViolations: ScannerViolation[] = [];
      const scannedUrls = new Set<string>();

      for (const pageUrl of urlsToScan) {
        if (scannedUrls.has(pageUrl)) continue;
        scannedUrls.add(pageUrl);

        try {
          const pageHtml = pageUrl === url ? documentHtml : await fetchHtml(pageUrl);

          for (const rule of VIOLATION_PATTERNS) {
            const matchResult = rule.check(pageHtml);
            if (matchResult) {
              allViolations.push({
                ruleId: rule.ruleId,
                wcagCriteria: rule.wcagCriteria,
                severity: rule.severity,
                url: pageUrl,
                elementSelector: null,
                elementHtml: matchResult.elementHtml,
                description: matchResult.description,
                remediationCode: matchResult.remediationCode,
                aiExplanation: matchResult.aiExplanation,
                aiConfidenceScore: 0.88,
                status: 'open',
              });
            }
          }
        } catch {
          continue;
        }
      }

      return { violations: allViolations, pagesScanned: scannedUrls.size };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { violations: [], pagesScanned: 0, error: message };
    }
  },
};
