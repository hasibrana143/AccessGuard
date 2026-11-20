import type { ScannerViolation, Severity } from '../types';

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

const WCAG_TAGS: Array<[string, string]> = [
  ['wcag22aa', '2.2 AA'],
  ['wcag21aa', '2.1 AA'],
  ['wcag21a', '2.1 A'],
  ['wcag2aa', '2.0 AA'],
  ['wcag2a', '2.0 A'],
];

export function mapImpact(impact: string | null | undefined): Severity {
  switch (impact) {
    case 'critical': return 'critical';
    case 'serious': return 'serious';
    case 'moderate': return 'moderate';
    case 'minor': return 'minor';
    default: return 'serious';
  }
}

/** Prefer the newest WCAG version a rule is tagged with. */
export function mapWcagCriteria(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return 'unknown';
  for (const [tag, label] of WCAG_TAGS) {
    if (tags.includes(tag)) return label;
  }
  return 'unknown';
}

export function createViolation(input: {
  ruleId: string;
  tags?: string[];
  impact?: string | null;
  url: string;
  target?: unknown;
  html?: string | null;
  help?: string | null;
  helpUrl?: string | null;
}): ScannerViolation {
  const path = Array.isArray(input.target)
    ? input.target.filter((part): part is string => typeof part === 'string' && part.length > 0)
    : [];
  const description = input.help || input.ruleId;

  return {
    ruleId: input.ruleId,
    wcagCriteria: mapWcagCriteria(input.tags),
    severity: mapImpact(input.impact),
    url: input.url,
    elementSelector: path.length > 0 ? path[path.length - 1]! : null,
    elementPath: path.length > 0 ? path : null,
    helpUrl: input.helpUrl ?? null,
    elementHtml: input.html ? input.html.substring(0, 500) : null,
    description,
    // Scanner never fabricates a fix. Context-aware generation happens in /api/remediate.
    remediationCode: null,
    aiExplanation: input.helpUrl ? `${description} (${input.helpUrl})` : description,
    aiConfidenceScore: null,
    status: 'open',
  };
}

/** Merge viewport passes, keeping the highest severity per rule + element. */
export function mergeViolations(a: ScannerViolation[], b: ScannerViolation[]): ScannerViolation[] {
  const merged = new Map<string, ScannerViolation>();
  for (const violation of [...a, ...b]) {
    const key = `${violation.ruleId}|${violation.url}|${violation.elementSelector ?? ''}`;
    const existing = merged.get(key);
    if (!existing || SEVERITY_RANK[violation.severity] > SEVERITY_RANK[existing.severity]) {
      merged.set(key, violation);
    }
  }
  return [...merged.values()];
}
