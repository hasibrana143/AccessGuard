import { chromium, type Browser, type Page } from 'playwright';
import type { ScannerStrategy, ScanResult, ScannerViolation, ScanConfig } from '../types';
import { logger } from '@/lib/error-logger';
import { validateTargetUrl } from '@/lib/url-validation';
import { axeCoreStrategy } from './axe-core';
import { generateFingerprint } from './fingerprint';
import { mergeViolations } from './axe-utils';

interface DiscoveredPage {
  url: string;
  depth: number;
  referrer?: string;
}

interface CrawlResult {
  pages: Array<{
    url: string;
    violations: ScannerViolation[];
    screenshot?: string;
    error?: string;
  }>;
  totalViolations: ScannerViolation[];
  pagesScanned: number;
  errors: string[];
}

const MAX_PAGES_DEFAULT = 100;
const REQUEST_DELAY_MS = 500;
const MAX_DEPTH = 3;

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    return url;
  }
}

function sameOrigin(base: string, target: string): boolean {
  try {
    const baseUrl = new URL(base);
    const targetUrl = new URL(target);
    return baseUrl.origin === targetUrl.origin;
  } catch {
    return false;
  }
}

function isSubdomain(base: string, target: string): boolean {
  try {
    const baseUrl = new URL(base);
    const targetUrl = new URL(target);
    return targetUrl.hostname.endsWith(baseUrl.hostname);
  } catch {
    return false;
  }
}

function shouldExclude(url: string, excludePaths: string[]): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname;
    return excludePaths.some(pattern => {
      if (pattern.endsWith('*')) {
        return path.startsWith(pattern.slice(0, -1));
      }
      return path === pattern || path.startsWith(pattern + '/');
    });
  } catch {
    return false;
  }
}

async function discoverSitemapUrls(baseUrl: string): Promise<string[]> {
  try {
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();
    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'AccessGuard-Crawler/1.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];

    const text = await response.text();
    const urls: string[] = [];
    const urlMatches = text.matchAll(/<loc>([^<]+)<\/loc>/gi);
    for (const match of urlMatches) {
      const url = match[1].trim();
      if (sameOrigin(baseUrl, url)) urls.push(normalizeUrl(url));
    }
    return [...new Set(urls)];
  } catch {
    return [];
  }
}

async function discoverLinks(page: Page, baseUrl: string, includeSubdomains: boolean): Promise<string[]> {
  try {
    const links = await page.evaluate((config) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map(a => a.getAttribute('href'))
        .filter((href): href is string => !!href)
        .map(href => {
          try {
            return new URL(href, window.location.href).toString();
          } catch {
            return null;
          }
        })
        .filter((url): url is string => !!url);
    }, { includeSubdomains });

    return links
      .filter(url => {
        if (!sameOrigin(baseUrl, url) && !includeSubdomains) return false;
        if (!sameOrigin(baseUrl, url) && includeSubdomains && !isSubdomain(baseUrl, url)) return false;
        return true;
      })
      .map(normalizeUrl);
  } catch {
    return [];
  }
}

async function crawl(
  browser: Browser,
  startUrl: string,
  config: ScanConfig
): Promise<CrawlResult> {
  const maxPages = config.maxPages ?? MAX_PAGES_DEFAULT;
  const excludePaths = config.excludePaths ?? [];
  const includeSubdomains = config.includeSubdomains ?? false;

  const discovered = new Map<string, DiscoveredPage>();
  const scanned = new Set<string>();
  const queue: DiscoveredPage[] = [{ url: normalizeUrl(startUrl), depth: 0 }];
  discovered.set(normalizeUrl(startUrl), { url: normalizeUrl(startUrl), depth: 0 });

  // Try sitemap first
  const sitemapUrls = await discoverSitemapUrls(startUrl);
  for (const url of sitemapUrls) {
    if (!discovered.has(url) && !shouldExclude(url, excludePaths)) {
      discovered.set(url, { url, depth: 1 });
      queue.push({ url, depth: 1 });
    }
  }

  const results: CrawlResult = {
    pages: [],
    totalViolations: [],
    pagesScanned: 0,
    errors: [],
  };

  let lastRequest = 0;

  while (queue.length > 0 && results.pagesScanned < maxPages) {
    const current = queue.shift()!;
    const normalizedUrl = normalizeUrl(current.url);

    if (scanned.has(normalizedUrl)) continue;
    if (shouldExclude(normalizedUrl, excludePaths)) continue;

    // Rate limiting
    const now = Date.now();
    const delay = Math.max(0, REQUEST_DELAY_MS - (now - lastRequest));
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    lastRequest = Date.now();

    scanned.add(normalizedUrl);

    // Scan the page using axeCoreStrategy (reuse browser context)
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      locale: 'en-US',
      ignoreHTTPSErrors: false,
    });

    try {
      const scanResult = await axeCoreStrategy.scan(normalizedUrl, null, {
        ...config,
        viewports: ['desktop'],
      });

      let screenshot: string | undefined;
      if (config.takeScreenshot && scanResult.screenshot) {
        screenshot = scanResult.screenshot;
      }

      results.pages.push({
        url: normalizedUrl,
        violations: scanResult.violations,
        screenshot,
        error: scanResult.error,
      });

      results.totalViolations = mergeViolations(results.totalViolations, scanResult.violations);
      results.pagesScanned++;

      if (scanResult.error) {
        results.errors.push(`${normalizedUrl}: ${scanResult.error}`);
      }

      // Discover more links if not at max depth
      if (current.depth < MAX_DEPTH) {
        const page = await context.newPage();
        try {
          await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
          const newLinks = await discoverLinks(page, startUrl, includeSubdomains);
          for (const link of newLinks) {
            if (!discovered.has(link) && !shouldExclude(link, excludePaths)) {
              discovered.set(link, { url: link, depth: current.depth + 1, referrer: normalizedUrl });
              queue.push({ url: link, depth: current.depth + 1 });
            }
          }
        } catch {
          // Ignore link discovery errors
        } finally {
          await page.close().catch(() => {});
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`${normalizedUrl}: ${message}`);
      results.pages.push({
        url: normalizedUrl,
        violations: [],
        error: message,
      });
    } finally {
      await context.close().catch((err) => logger.warn({ err }, 'Crawl context close error'));
    }
  }

  return results;
}

export const crawlerStrategy: ScannerStrategy = {
  name: 'crawler',
  canHandle() {
    return true;
  },
  async scan(url: string, _html: string | null, config?: ScanConfig): Promise<ScanResult> {
    let browser: Browser | null = null;
    const started = Date.now();

    try {
      const urlCheck = await validateTargetUrl(url);
      if (!urlCheck.ok) {
        return { violations: [], pagesScanned: 0, error: `Blocked target: ${urlCheck.error}` };
      }

      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });

      const crawlResult = await crawl(browser, url, config || {});

      // Add fingerprint to all violations
      const violationsWithFingerprint = crawlResult.totalViolations.map(v => ({
        ...v,
        fingerprint: generateFingerprint(v),
      }));

      logger.info(
        { url, pagesScanned: crawlResult.pagesScanned, violations: violationsWithFingerprint.length, ms: Date.now() - started },
        'Crawl scan completed'
      );

      return {
        violations: violationsWithFingerprint,
        pagesScanned: crawlResult.pagesScanned,
        error: crawlResult.errors.length > 0 ? crawlResult.errors.join('; ') : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { violations: [], pagesScanned: 0, error: message };
    } finally {
      if (browser) {
        await browser.close().catch((err) => logger.warn({ err }, 'Browser close error'));
      }
    }
  },
};

export { crawl, type CrawlResult, type DiscoveredPage };