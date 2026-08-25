'use client';

import { useTranslations } from 'next-intl';
import { useScans } from '@/hooks/useApi';
import { ScheduledScans } from '@/components/scans/scheduled-scans';
import { ScanList } from '@/components/scans/scan-list';

export default function ScansPage() {
  const t = useTranslations('scans');
  const { data: scans, isLoading } = useScans();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <ScheduledScans />
      <ScanList scans={scans} isLoading={isLoading} />
    </div>
  );
}
