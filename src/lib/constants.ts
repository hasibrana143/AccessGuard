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

export function getRiskLabel(score: number): string {
  if (score >= 80) return 'Low Risk';
  if (score >= 60) return 'Medium Risk';
  if (score >= 40) return 'High Risk';
  return 'Critical Risk';
}

export function formatDate(date: string | Date | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}
