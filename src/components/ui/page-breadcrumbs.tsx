'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BreadcrumbSegment {
  label: string;
  href: string;
  isCurrent?: boolean;
}

export function PageBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const segments: BreadcrumbSegment[] = [];

  // Build breadcrumb segments from pathname
  const parts = pathname.split('/').filter(Boolean);

  // Skip '(dashboard)' group segment
  let accumulatedPath = '';

  for (const part of parts) {
    if (part.startsWith('(')) continue; // Skip route groups

    accumulatedPath += `/${part}`;

    // Map route to translated label
    const labelMap: Record<string, string> = {
      dashboard: t('dashboard'),
      projects: t('projects'),
      scans: t('scans'),
      violations: t('violations'),
      reports: t('reports'),
      settings: t('settings'),
      team: t('team'),
      admin: t('admin'),
      'audit-logs': t('auditLogs'),
    };

    // Check if this is a UUID/ID segment (detail page)
    const isId = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(part) ||
      part.startsWith('[');

    if (isId) {
      segments.push({
        label: `#${part.slice(0, 8)}`,
        href: accumulatedPath,
        isCurrent: true,
      });
    } else if (labelMap[part]) {
      segments.push({
        label: labelMap[part],
        href: accumulatedPath,
      });
    }
  }

  if (segments.length <= 1) return null; // Don't show breadcrumbs on root dashboard

  // Mark last segment as current
  if (segments.length > 0) {
    segments[segments.length - 1].isCurrent = true;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment) => (
        <span key={segment.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {segment.isCurrent ? (
            <span className="text-foreground font-medium">{segment.label}</span>
          ) : (
            <Link href={segment.href} className="hover:text-foreground transition-colors">
              {segment.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
