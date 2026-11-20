import type { Severity, ViolationStatus } from '@/types';

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'var(--critical)',
  serious: 'var(--serious)',
  moderate: 'var(--moderate)',
  minor: 'var(--minor)',
};

export const SEVERITY_BG: Record<Severity, string> = {
  critical: 'bg-critical/10',
  serious: 'bg-serious/10',
  moderate: 'bg-moderate/10',
  minor: 'bg-minor/10',
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-critical',
  serious: 'text-serious',
  moderate: 'text-moderate',
  minor: 'text-minor',
};

export const WCAG_LEVELS = ['A', 'AA', 'AAA'] as const;
export const WCAG_CATEGORIES = ['perceivable', 'operable', 'understandable', 'robust'] as const;

export function getSeverityBadge(severity: Severity) {
  const styles: Record<Severity, string> = {
    critical: 'bg-critical/10 text-critical border-critical/20',
    serious: 'bg-serious/10 text-serious border-serious/20',
    moderate: 'bg-moderate/10 text-moderate border-moderate/20',
    minor: 'bg-minor/10 text-minor border-minor/20',
  };
  return styles[severity];
}

export function getStatusBadge(status: ViolationStatus) {
  const styles: Record<ViolationStatus, string> = {
    open: 'bg-red-500/10 text-red-500',
    fixed: 'bg-emerald-500/10 text-emerald-500',
    ignored: 'bg-gray-500/10 text-gray-500',
    false_positive: 'bg-blue-500/10 text-blue-500',
  };
  return styles[status];
}

export function getRiskColor(score: number): string {
  if (score >= 80) return 'text-emerald';
  if (score >= 60) return 'text-moderate';
  if (score >= 40) return 'text-serious';
  return 'text-critical';
}

export function getRiskGradient(score: number): string {
  if (score >= 80) return 'from-emerald to-emerald';
  if (score >= 60) return 'from-moderate to-moderate';
  if (score >= 40) return 'from-serious to-serious';
  return 'from-critical to-critical';
}

export type RiskLabelKey = 'riskLow' | 'riskMedium' | 'riskHigh' | 'riskCritical';

/** Returns a `common.*` i18n key — callers translate via `t(getRiskLabelKey(score))`. */
export function getRiskLabelKey(score: number): RiskLabelKey {
  if (score >= 80) return 'riskLow';
  if (score >= 60) return 'riskMedium';
  if (score >= 40) return 'riskHigh';
  return 'riskCritical';
}

/** @deprecated Use getRiskLabelKey + next-intl instead (hardcoded English). */
export function getRiskLabel(score: number): string {
  const labels: Record<RiskLabelKey, string> = {
    riskLow: 'Low Risk',
    riskMedium: 'Medium Risk',
    riskHigh: 'High Risk',
    riskCritical: 'Critical Risk',
  };
  return labels[getRiskLabelKey(score)];
}

export function formatDate(date: string | Date | null, locale?: string): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export interface RelativeTimeStrings {
  justNow: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
}

const EN_RELATIVE: RelativeTimeStrings = {
  justNow: 'Just now',
  minutesAgo: (count) => `${count}m ago`,
  hoursAgo: (count) => `${count}h ago`,
  daysAgo: (count) => `${count}d ago`,
};

export function formatRelativeTime(date: string | Date, strings: RelativeTimeStrings = EN_RELATIVE, locale?: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return strings.justNow;
  if (minutes < 60) return strings.minutesAgo(minutes);
  if (hours < 24) return strings.hoursAgo(hours);
  if (days < 7) return strings.daysAgo(days);
  return formatDate(date, locale);
}
