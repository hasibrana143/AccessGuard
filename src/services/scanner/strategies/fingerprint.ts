import { createHash } from 'crypto';

/**
 * Generate a stable fingerprint for a violation.
 * Used for deduplication and reconciliation across scans.
 * 
 * Format: SHA256(ruleId|url|normalizedSelector|normalizedHtml)[:16]
 * 
 * Normalization:
 * - Selector: strip dynamic attributes (data-*, nth-child), keep structural path
 * - HTML: strip whitespace, normalize attribute order, remove dynamic values
 */
export function generateFingerprint(violation: {
  ruleId: string;
  url: string;
  elementSelector: string | null;
  elementHtml: string | null;
}): string {
  const normalizedSelector = normalizeSelector(violation.elementSelector);
  const normalizedHtml = normalizeHtml(violation.elementHtml);
  const input = `${violation.ruleId}|${violation.url}|${normalizedSelector}|${normalizedHtml}`;
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function normalizeSelector(selector: string | null): string {
  if (!selector) return '';
  return selector
    .replace(/\[data-[^\]]+\]/gi, '')      // data-* attributes
    .replace(/\[id="[^"]*"\]/gi, '')       // id attributes
    .replace(/\[class="[^"]*"\]/gi, '')    // class attributes
    .replace(/:nth-child\([^)]+\)/gi, '')  // nth-child
    .replace(/:nth-of-type\([^)]+\)/gi, '')
    .replace(/\s*>\s*/g, '>')              // normalize whitespace around >
    .replace(/\s+/g, ' ')                  // collapse whitespace
    .trim();
}

function normalizeHtml(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/\s+/g, ' ')                  // collapse whitespace
    .replace(/ (id|class|data-[^=]+)="[^"]*"/gi, '') // remove dynamic attrs
    .replace(/style="[^"]*"/gi, '')        // inline styles
    .replace(/href="[^"]*"/gi, 'href=""')  // normalize links
    .replace(/src="[^"]*"/gi, 'src=""')    // normalize images
    .trim();
}

/** Compare two violation sets and return reconciliation result. */
export interface ReconciliationResult {
  new: Array<{ violation: any; fingerprint: string }>;
  persisting: Array<{ current: any; previous: any; fingerprint: string }>;
  fixed: Array<{ previous: any; fingerprint: string }>;
  regressed: Array<{ current: any; previous: any; fingerprint: string }>;
}

export function reconcileViolations(
  current: Array<{ violation: any; fingerprint: string }>,
  previous: Array<{ violation: any; fingerprint: string; id: string }>
): ReconciliationResult {
  const prevMap = new Map(previous.map(p => [p.fingerprint, p]));
  const currMap = new Map(current.map(c => [c.fingerprint, c]));

  const newViolations: ReconciliationResult['new'] = [];
  const persisting: ReconciliationResult['persisting'] = [];
  const regressed: ReconciliationResult['regressed'] = [];

  for (const [fp, curr] of currMap) {
    const prev = prevMap.get(fp);
    if (!prev) {
      newViolations.push({ violation: curr.violation, fingerprint: fp });
    } else if (prev.violation.status === 'fixed') {
      regressed.push({ current: curr.violation, previous: prev.violation, fingerprint: fp });
    } else {
      persisting.push({ current: curr.violation, previous: prev.violation, fingerprint: fp });
    }
  }

  const fixed: ReconciliationResult['fixed'] = [];
  for (const [fp, prev] of prevMap) {
    if (!currMap.has(fp) && prev.violation.status !== 'fixed') {
      fixed.push({ previous: prev.violation, fingerprint: fp });
    }
  }

  return { new: newViolations, persisting, fixed, regressed };
}