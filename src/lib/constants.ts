import type { Severity, ViolationStatus } from '@/types';

export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ef4444',
  serious: '#f97316',
  moderate: '#eab308',
  minor: '#3b82f6',
};

export const SEVERITY_BG: Record<Severity, string> = {
  critical: 'bg-red-500/10',
  serious: 'bg-orange-500/10',
  moderate: 'bg-yellow-500/10',
  minor: 'bg-blue-500/10',
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  critical: 'text-red-500',
  serious: 'text-orange-500',
  moderate: 'text-yellow-500',
  minor: 'text-blue-500',
};

export const WCAG_LEVELS = ['A', 'AA', 'AAA'] as const;
export const WCAG_CATEGORIES = ['perceivable', 'operable', 'understandable', 'robust'] as const;

export function getSeverityBadge(severity: Severity) {
  const styles: Record<Severity, string> = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    serious: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    moderate: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    minor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
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
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

export function getRiskGradient(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-emerald-600';
  if (score >= 60) return 'from-yellow-500 to-yellow-600';
  if (score >= 40) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
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
