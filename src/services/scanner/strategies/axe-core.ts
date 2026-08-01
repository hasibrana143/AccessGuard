import puppeteer, { type Browser, type Page } from 'puppeteer';
import type { ScannerStrategy, ScanResult, ScannerViolation, ScanConfig } from '../types';
import { logger } from '@/lib/error-logger';

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

async function runAxeOnPage(page: Page, url: string): Promise<ScannerViolation[]> {
  const violations: ScannerViolation[] = [];

  try {
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        if (typeof (window as any).axe !== 'undefined') { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.8.4/axe.min.js';
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });
    });

    const results = await page.evaluate(async () => {
      return await (window as any).axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
      });
    });

    for (const violation of results.violations || []) {
      const { code, explanation } = generateRemediation(violation.id, violation.helpUrl);

      for (const node of violation.nodes || []) {
        violations.push({
          ruleId: violation.id,
          wcagCriteria: violation.tags?.find((t: string) => t.startsWith('wcag21') || t.startsWith('wcag2'))?.replace(/^wcag2\d?/, '').split('').join('.') ?? 'unknown',
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
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
          '--disable-gpu', '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      if (config?.waitForSelector) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector(config.waitForSelector, { timeout: 10000 });
      } else {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      }

      const currentUrl = page.url();

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
