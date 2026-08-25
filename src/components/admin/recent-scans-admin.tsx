'use client';

import { useTranslations } from 'next-intl';
import { Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/constants';

interface RecentScan {
  id: string;
  status: string;
  pagesScanned: number;
  violationsFound: number;
  createdAt: string;
  project: { name: string };
}

interface RecentScansAdminProps {
  scans: RecentScan[];
}

export function RecentScansAdmin({ scans }: RecentScansAdminProps) {
  const t = useTranslations('admin');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-coral" />{t('recentScans')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {scans.map((scan) => (
            <div key={scan.id} className="flex items-center gap-4 p-4">
              <div className={`p-2.5 rounded-lg ${scan.status === 'completed' ? 'bg-emerald-500/10' : scan.status === 'failed' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                {scan.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : scan.status === 'failed' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{scan.project.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t('scanCounts', { pages: scan.pagesScanned, violations: scan.violationsFound, date: formatRelativeTime(scan.createdAt) })}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">{scan.status}</Badge>
            </div>
          ))}
          {scans.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t('noScans')}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
