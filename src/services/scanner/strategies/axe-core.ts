import puppeteer, { type Browser, type Page } from 'puppeteer';
import type { ScannerStrategy, ScanResult, ScannerViolation, ScanConfig } from '../types';
import { logger } from '@/lib/error-logger';
import { validateTargetUrl } from '@/lib/url-validation';

function mapImpact(impact: string | null): ScannerViolation['severity'] {
  switch (impact) {
    case 'critical': return 'critical';
    case 'serious': return 'serious';
    case 'moderate': return 'moderate';
    case 'minor': return 'minor';
    default: return 'serious';
  }
}

function generateRemediation(ruleId: string, helpUrl: string): { code: string; explanation: string } {
  const remediations: Record<string, { code: string; explanation: string }> = {
    'image-alt': {
      code: '<img alt="Descriptive text describing the image content" src="..." />',
      explanation: 'Add an alt attribute that describes the image content.'
    },
    'label': {
      code: '<label for="input-id">Field Label</label>\n<input id="input-id" type="text" />',
      explanation: 'Associate a label with the form control using the for attribute.'
    },
    'color-contrast': {
      code: 'color: #1f2937;\nbackground-color: #ffffff;',
      explanation: 'Increase contrast between text and background to meet WCAG AA 4.5:1 ratio.'
    },
    'link-name': {
      code: '<a href="...">Descriptive link text</a>',
      explanation: 'Replace generic link text with specific text describing the destination.'
    },
    'document-title': {
      code: '<title>Page Title | Site Name</title>',
      explanation: 'Add a descriptive title element to the page head.'
    },
    'html-has-lang': {
      code: '<html lang="en">',
      explanation: 'Add a lang attribute to the html element.'
    },
  };

  return remediations[ruleId] || {
    code: `<!-- See ${helpUrl} -->`,
    explanation: `Review WCAG guidelines at ${helpUrl} for remediation.`
  };
}

const WCAG_TAG_MAP: Record<string, string> = {
  wcag22aaa: '2.2 AAA',
  wcag22aa: '2.2 AA',
  wcag22a: '2.2 A',
  wcag21aaa: '2.1 AAA',
  wcag21aa: '2.1 AA',
  wcag21a: '2.1 A',
  wcag2aaa: '2.1 AAA',
  wcag2aa: '2.1 AA',
  wcag2a: '2.1 A',
};

function mapWcagCriteria(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return 'unknown';
  for (const tag of tags) {
    const mapped = WCAG_TAG_MAP[tag];
    if (mapped) return mapped;
  }
  return 'unknown';
}

const AXE_CDN_LOAD_TIMEOUT_MS = 10_000;
const AXE_RUN_TIMEOUT_MS = 45_000;

function timeoutAfter(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

async function runAxeOnPage(page: Page, url: string): Promise<ScannerViolation[]> {
  const violations: ScannerViolation[] = [];

  try {
    await Promise.race([
      page.evaluate(() => {
        return new Promise<void>((resolve, reject) => {
          if (typeof (window as any).axe !== 'undefined') { resolve(); return; }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js';
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }),
      timeoutAfter(AXE_CDN_LOAD_TIMEOUT_MS, 'axe-core CDN load timed out'),
    ]);

    const results = await Promise.race([
      page.evaluate(async () => {
        return await (window as any).axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
        });
      }),
      timeoutAfter(AXE_RUN_TIMEOUT_MS, 'axe-core analysis timed out'),
    ]);

    for (const violation of results.violations || []) {
      const { code, explanation } = generateRemediation(violation.id, violation.helpUrl);

      for (const node of violation.nodes || []) {
        violations.push({
          ruleId: violation.id,
          wcagCriteria: mapWcagCriteria(violation.tags),
          severity: mapImpact(violation.impact),
          url,
          elementSelector: node.target?.join(' > ') ?? null,
          elementHtml: node.html?.substring(0, 500) ?? null,
          description: violation.help,
          remediationCode: code,
          aiExplanation: `${explanation}\n\n${violation.helpUrl}`,
          aiConfidenceScore: 0.92,
          status: 'open',
        });
      }
    }
  } catch (error) {
    logger.error({ err: error }, '');
  }

  return violations;
}

export const axeCoreStrategy: ScannerStrategy = {
  name: 'axe-core',
  canHandle(_url: string) {
    return true;
  },
  async scan(url: string, _html: string | null, config?: ScanConfig): Promise<ScanResult> {
    let browser: Browser | null = null;

    try {
      const urlCheck = await validateTargetUrl(url);
      if (!urlCheck.ok) {
        return { violations: [], pagesScanned: 0, error: `Blocked target: ${urlCheck.error}` };
      }

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      if (config?.waitForSelector) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector(config.waitForSelector, { timeout: 10000 });
      } else {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      }

      const currentUrl = page.url();

      // Re-validate the post-redirect URL against private/blocked targets
      const finalCheck = await validateTargetUrl(currentUrl);
      if (!finalCheck.ok) {
        throw new Error(`Blocked target after redirect: ${finalCheck.error}`);
      }

      if (config?.waitTime) {
        await new Promise(r => setTimeout(r, config.waitTime));
      }

      const violations = await runAxeOnPage(page, currentUrl);

      let screenshot: string | undefined;
      if (config?.takeScreenshot) {
        screenshot = await page.screenshot({ encoding: 'base64', fullPage: false }) as string;
      }

      return { violations, pagesScanned: 1, screenshot };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { violations: [], pagesScanned: 0, error: message };
    } finally {
      if (browser) await browser.close().catch((err) => logger.warn({ err }, 'Browser close error'));
    }
  },
};
