// Verification of a proposed fix: re-run axe on the patched element and let the
// result decide whether the fix may reach a customer repository.
//
// The rule is evaluated in isolation, which proves that the remediation resolves the
// rule it claims to fix for that element. It is not a full page re-scan: the
// customer's build is not available here. When the rule cannot be evaluated (no
// browser, unknown rule, incomplete result) the fix stays unverified and is skipped.

import fs from 'node:fs';
import { chromium, type Browser } from 'playwright';
import * as axeCore from 'axe-core';
import { validateFixCandidate } from '@/lib/github-pr';

export const MIN_FIX_CONFIDENCE = 0.7;
export const VERIFIED_FIX_CONFIDENCE = 1;

/** Upper bound of fixes processed in one PR request (one axe run and one patch each). */
export const MAX_FIXES_PER_PR = 25;

export type VerificationStatus = 'verified' | 'failed' | 'unverified';

export interface FixVerificationResult {
  status: VerificationStatus;
  /** Verification derived confidence: 1 when verified, 0 when failed, null when unknown. */
  confidence: number | null;
  reason: string;
}

export interface VerifiableFix {
  id: string;
  ruleId: string;
  remediationCode: string;
  /** The element the fix targets; used by the safety checks before rendering. */
  elementHtml?: string | null;
}

export interface RuleVerdict {
  /** The rule reported a violation on the patched element. */
  fired: boolean;
  /** The rule was actually evaluated (not skipped, not incomplete, not unknown). */
  evaluated: boolean;
  detail?: string;
}

export type RuleRunner = (remediationCode: string, ruleId: string) => Promise<RuleVerdict>;

const AXE_SOURCE =
  (axeCore as unknown as { source?: string }).source ??
  (axeCore as unknown as { default?: { source?: string } }).default?.source;

function toDocument(remediationCode: string): string {
  if (/<(html|head|body|title)[\s>]/i.test(remediationCode)) return remediationCode;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fix verification</title></head><body>${remediationCode}</body></html>`;
}

/** Chromium locations that are usable when Playwright's own browser is not installed. */
export function resolveChromiumExecutable(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter((c): c is string => !!c);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // Unreadable path, try the next candidate.
    }
  }
  return undefined;
}

/** Hard deadline for one verification run (render + axe). */
const VERIFICATION_TIMEOUT_MS = 15_000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Chromium flags. The OS sandbox is only disabled where it cannot be used (the
 * Docker image runs Chromium as root); everywhere else the sandbox stays on.
 */
function chromiumArgs(): string[] {
  const args = ['--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
  const getuid = (process as { getuid?: () => number }).getuid;
  const runningAsRoot = typeof getuid === 'function' && getuid() === 0;
  if (runningAsRoot || process.env.CHROMIUM_NO_SANDBOX === '1') args.unshift('--no-sandbox');
  return args;
}

async function runRuleInBrowser(
  browser: Browser,
  remediationCode: string,
  ruleId: string
): Promise<RuleVerdict> {
  if (!AXE_SOURCE) throw new Error('axe-core source unavailable');

  const context = await browser.newContext();
  // The rendered snippet is untrusted markup: no request may leave the browser
  // (no remote images, no beacons, no SSRF through the verification run).
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(VERIFICATION_TIMEOUT_MS);
  try {
    await withTimeout(
      page.setContent(toDocument(remediationCode), { waitUntil: 'domcontentloaded' }),
      VERIFICATION_TIMEOUT_MS,
      'rendering the fix'
    );
    await page.addScriptTag({ content: AXE_SOURCE });

    const summary = await withTimeout(
      page.evaluate(async (rule: string) => {
        const axe = (
          window as unknown as {
            axe: {
              run: (
                context: Document,
                options: unknown
              ) => Promise<{ violations: Array<{ id: string }>; incomplete: Array<{ id: string }> }>;
            };
          }
        ).axe;
        const result = await axe.run(document, { runOnly: { type: 'rule', values: [rule] } });
        return {
          violations: result.violations.map(v => v.id),
          incomplete: result.incomplete.map(v => v.id),
        };
      }, ruleId),
      VERIFICATION_TIMEOUT_MS,
      `running axe for ${ruleId}`
    );

    if (summary.violations.includes(ruleId)) {
      return { fired: true, evaluated: true, detail: `axe still reports ${ruleId} on the patched element` };
    }
    if (summary.incomplete.includes(ruleId)) {
      return {
        fired: false,
        evaluated: false,
        detail: `axe could not evaluate ${ruleId} on the patched element in isolation`,
      };
    }
    return {
      fired: false,
      evaluated: true,
      detail: `axe confirms ${ruleId} no longer fires on the patched element`,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

/** Map an axe verdict onto the confidence the PR gate reads. */
export function verdictToResult(verdict: RuleVerdict): FixVerificationResult {
  if (verdict.fired) {
    return {
      status: 'failed',
      confidence: 0,
      reason: verdict.detail ?? 'the rule still fires on the patched element',
    };
  }
  if (!verdict.evaluated) {
    return {
      status: 'unverified',
      confidence: null,
      reason: verdict.detail ?? 'the rule could not be evaluated on the patched element',
    };
  }
  return {
    status: 'verified',
    confidence: VERIFIED_FIX_CONFIDENCE,
    reason: verdict.detail ?? 'axe confirms the rule no longer fires on the patched element',
  };
}

/** The gate: an unknown confidence never passes. */
export function passesConfidenceGate(
  confidence: number | null,
  min: number = MIN_FIX_CONFIDENCE
): boolean {
  return confidence !== null && Number.isFinite(confidence) && confidence >= min;
}

export interface FixCandidate {
  id: string;
  ruleId: string;
  elementHtml: string | null;
  remediationCode: string | null;
}

export interface FixSelection {
  /** Ids of the fixes that may be written to the repository. */
  eligibleIds: string[];
  /** Fixes rejected by the safety, rule or placeholder checks. */
  skippedInvalid: number;
  /** Valid fixes beyond the per-request limit. */
  skippedOverLimit: number;
  /** Fixes whose verification failed (axe still reports the rule). */
  skippedLowConfidence: number;
  /** Fixes that could not be verified (no browser, rule not evaluable). */
  skippedUnverified: number;
}

/**
 * Decide what may reach a repository: a fix has to pass the safety checks, fit in the
 * request budget and be verified. Everything else is reported, never silently dropped.
 */
export function selectVerifiedFixes(
  candidates: FixCandidate[],
  verification: Map<string, FixVerificationResult>,
  max: number = MAX_FIXES_PER_PR
): FixSelection {
  const valid: FixCandidate[] = [];
  let skippedInvalid = 0;

  for (const candidate of candidates) {
    if (!candidate.remediationCode) continue;
    if (validateFixCandidate(candidate).valid) valid.push(candidate);
    else skippedInvalid++;
  }

  const batch = valid.slice(0, max);
  const eligibleIds: string[] = [];
  let skippedLowConfidence = 0;
  let skippedUnverified = 0;

  for (const candidate of batch) {
    const confidence = verification.get(candidate.id)?.confidence ?? null;
    if (passesConfidenceGate(confidence)) {
      eligibleIds.push(candidate.id);
    } else if (confidence === null) {
      skippedUnverified++;
    } else {
      skippedLowConfidence++;
    }
  }

  return {
    eligibleIds,
    skippedInvalid,
    skippedOverLimit: valid.length - batch.length,
    skippedLowConfidence,
    skippedUnverified,
  };
}

async function launchBrowser(): Promise<{ browser: Browser | null; error: string | null }> {
  try {
    const executablePath = resolveChromiumExecutable();
    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: chromiumArgs(),
    });
    return { browser, error: null };
  } catch (error) {
    return { browser: null, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Verify fixes by re-running axe on each patched element.
 * One browser is used for the whole batch and closed afterwards.
 *
 * Safety comes first: a candidate that fails the injection, placeholder or rule
 * checks is never rendered, so unsafe markup cannot execute in the verification
 * browser and cannot fake an axe pass.
 */
export async function verifyFixes(
  fixes: VerifiableFix[],
  runner?: RuleRunner
): Promise<Map<string, FixVerificationResult>> {
  const results = new Map<string, FixVerificationResult>();
  if (fixes.length === 0) return results;

  const record = (fix: VerifiableFix, result: FixVerificationResult) => {
    results.set(fix.id, result);
  };

  const safe: VerifiableFix[] = [];
  for (const fix of fixes) {
    const validation = validateFixCandidate({
      ruleId: fix.ruleId,
      elementHtml: fix.elementHtml ?? null,
      remediationCode: fix.remediationCode,
    });
    if (!validation.valid) {
      record(fix, {
        status: 'unverified',
        confidence: null,
        reason: `rejected before verification: ${validation.reason}`,
      });
      continue;
    }
    safe.push(fix);
  }

  if (safe.length === 0) return results;

  if (runner) {
    for (const fix of safe) {
      try {
        record(fix, verdictToResult(await runner(fix.remediationCode, fix.ruleId)));
      } catch (error) {
        record(fix, {
          status: 'unverified',
          confidence: null,
          reason: `verification could not run: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
    return results;
  }

  const { browser, error } = await launchBrowser();
  if (!browser) {
    const reason = `verification browser unavailable: ${error}`;
    for (const fix of safe) {
      record(fix, { status: 'unverified', confidence: null, reason });
    }
    return results;
  }

  try {
    for (const fix of safe) {
      try {
        const verdict = await runRuleInBrowser(browser, fix.remediationCode, fix.ruleId);
        record(fix, verdictToResult(verdict));
      } catch (err) {
        record(fix, {
          status: 'unverified',
          confidence: null,
          reason: `verification could not run: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  return results;
}
