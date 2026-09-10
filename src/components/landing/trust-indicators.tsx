'use client';

import { useTranslations } from 'next-intl';
import { ScanLine, Code2, FileCheck2, BellRing } from 'lucide-react';

/**
 * What the product actually does — capability strip, not vanity metrics.
 * Every item maps to a real route or feature in the app.
 */
export function TrustIndicators() {
  const t = useTranslations('landing');
  const items = [
    { icon: ScanLine, label: t('capScan') },
    { icon: Code2, label: t('capFix') },
    { icon: FileCheck2, label: t('capReports') },
    { icon: BellRing, label: t('capMonitor') },
  ];
  return (
    <section className="py-12 border-y border-border bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 px-6 py-3">
              <item.icon aria-hidden="true" className="h-5 w-5 text-coral" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
