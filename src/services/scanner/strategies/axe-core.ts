import { chromium, type Browser, type Frame, type Page } from 'playwright';
import * as axeCore from 'axe-core';
import type { ScannerStrategy, ScanResult, ScannerViolation, ScanConfig } from '../types';
import { logger } from '@/lib/error-logger';
import { validateTargetUrl } from '@/lib/url-validation';
import type { AuthContext } from '@/lib/scan-auth';
import { createViolation, mergeViolations } from './axe-utils';

const AXE_SOURCE = (axeCore as unknown as { source?: string }).source;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const VIEWPORTS = {
  desktop: { width: 1366, height: 768 },
  mobile: { width: 375, height: 812 },
} as const;

type ViewportName = keyof typeof VIEWPORTS;

interface AxeNode {
  target?: unknown;
  html?: string | null;
}

interface AxeViolation {
  id: string;
  tags?: string[];
  impact?: string | null;
  help?: string;
  helpUrl?: string;
  nodes?: AxeNode[];
}

interface AxeResults {
  violations?: AxeViolation[];
}

async function ensureAxe(frame: Frame): Promise<void> {
  if (!AXE_SOURCE) throw new Error('axe-core source unavailable');
  const loaded = await frame.evaluate(
    () => typeof (window as unknown as { axe?: unknown }).axe !== 'undefined'
  );
  if (!loaded) await frame.addScriptTag({ content: AXE_SOURCE });
}

async function applyAuthContext(page: Page, authContext: AuthContext | undefined): Promise<void> {
  if (!authContext) return;

  // Apply cookies
  if (authContext.cookies && authContext.cookies.length > 0) {
    await page.context().addCookies(authContext.cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
    })));
  }

  // Apply headers
  if (authContext.headers && Object.keys(authContext.headers).length > 0) {
    await page.setExtraHTTPHeaders(authContext.headers);
  }

  const scriptConfig = authContext.scriptConfig;
  if (!scriptConfig) return;

  if (scriptConfig.loginUrl) {
    await page.goto(scriptConfig.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  }

  // Selector-based login using the credentials stored for this project.
  if (
    scriptConfig.usernameSelector &&
    scriptConfig.passwordSelector &&
    scriptConfig.submitSelector &&
    scriptConfig.username &&
    scriptConfig.password
  ) {
    await page.fill(scriptConfig.usernameSelector, scriptConfig.username);
    await page.fill(scriptConfig.passwordSelector, scriptConfig.password);
    await page.click(scriptConfig.submitSelector);
  }

  // Custom login script — runs in the page context (DOM/fetch APIs), so it
  // works on sites the selector flow cannot express. The credentials are
  // exposed to the page as window.__accessguardAuth for that purpose.
  if (authContext.script) {
    await page.evaluate((creds: { username?: string; password?: string }) => {
      (window as unknown as { __accessguardAuth?: unknown }).__accessguardAuth = creds;
    }, { username: scriptConfig.username, password: scriptConfig.password });
    await page.evaluate(`(async () => {\n${authContext.script}\n})()`);
  }

  if (scriptConfig.waitForSelector) {
    await page.waitForSelector(scriptConfig.waitForSelector, { timeout: 15_000 }).catch(() => {});
  }
  if (scriptConfig.waitAfterLogin) {
    await page.waitForTimeout(scriptConfig.waitAfterLogin);
  }
}

async function runAxeOnFrame(frame: Frame, fallbackUrl: string): Promise<ScannerViolation[]> {
  await ensureAxe(frame);
  const results = (await frame.evaluate(
    (tags) =>
      (
        window as unknown as {
          axe: { run: (context: Document, options: unknown) => Promise<unknown> };
        }
      ).axe.run(document, {
        runOnly: { type: 'tag', values: tags },
        iframes: false,
      }),
    AXE_TAGS
  )) as AxeResults;

  const url = frame.url() || fallbackUrl;
  const violations: ScannerViolation[] = [];
  for (const violation of results.violations ?? []) {
    for (const node of violation.nodes ?? []) {
      violations.push(
        createViolation({
          ruleId: violation.id,
          tags: violation.tags,
          impact: violation.impact,
          url,
          target: node.target,
          html: node.html,
          help: violation.help,
          helpUrl: violation.helpUrl,
        })
      );
    }
  }
  return violations;
}

/** Scan the top document plus child frames. Each frame gets its own axe run. */
async function runAxeOnPage(page: Page, fallbackUrl: string): Promise<ScannerViolation[]> {
  const violations: ScannerViolation[] = [];
  for (const frame of page.frames().slice(0, 10)) {
    try {
      violations.push(...(await runAxeOnFrame(frame, fallbackUrl)));
    } catch (error) {
      logger.warn({ err: error, url: frame.url() }, 'axe-core frame scan skipped');
    }
  }
  return violations;
}

/** Trigger lazy-loaded content before axe runs. Bounded to avoid infinite feeds. */
async function waitForLazyContent(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight, 400);
    const max = Math.min(document.body.scrollHeight, 20_000);
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
  });
}

async function scanViewport(
  browser: Browser,
  url: string,
  viewport: ViewportName,
  config?: ScanConfig & { authContext?: AuthContext }
): Promise<{ violations: ScannerViolation[]; screenshot?: string; error?: string }> {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewport],
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
    ignoreHTTPSErrors: false,
  });

  try {
    // CDP-injected, so it survives strict CSP and is present in child frames.
    if (AXE_SOURCE) await context.addInitScript({ content: AXE_SOURCE });
    const page = await context.newPage();

    // Apply auth context before navigation
    if (config?.authContext) {
      await applyAuthContext(page, config.authContext);
    }

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    } catch {
      // Polling SPAs can keep the network busy indefinitely; DOM ready is enough for axe.
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    }

    if (config?.waitForSelector) {
      await page.waitForSelector(config.waitForSelector, { timeout: 10_000 });
    }
    await page.waitForTimeout(config?.waitTime ?? 1_000);
    await waitForLazyContent(page);

    const finalUrl = page.url();
    const finalCheck = await validateTargetUrl(finalUrl);
    if (!finalCheck.ok) throw new Error(`Blocked target after redirect: ${finalCheck.error}`);

    const violations = await runAxeOnPage(page, finalUrl);
    let screenshot: string | undefined;
    if (config?.takeScreenshot) {
      screenshot = (await page.screenshot({ fullPage: false })).toString('base64');
    }

    return { violations, screenshot };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { violations: [], error: `${viewport}: ${message}` };
  } finally {
    await context.close().catch((err) => logger.warn({ err }, 'Scan context close error'));
  }
}

export const axeCoreStrategy: ScannerStrategy = {
  name: 'axe-core',
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
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const viewports: ViewportName[] =
        config?.viewports && config.viewports.length > 0 ? config.viewports : ['desktop', 'mobile'];
      const results = await Promise.all(
        viewports.map((viewport) => scanViewport(browser!, url, viewport, config))
      );

      if (results.every((result) => result.error)) {
        return {
          violations: [],
          pagesScanned: 0,
          error: results.map((result) => result.error).join('; '),
        };
      }

      const violations = results.reduce(
        (acc, result) => mergeViolations(acc, result.violations),
        [] as ScannerViolation[]
      );
      const screenshot = results.find((result) => result.screenshot)?.screenshot;

      logger.info(
        { url, viewports, violations: violations.length, ms: Date.now() - started },
        'Browser scan completed'
      );

      return { violations, pagesScanned: 1, screenshot };
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
