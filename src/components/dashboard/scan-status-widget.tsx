'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, CheckCircle2, Loader2, XCircle, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Scan } from '@/types';

interface ScanStatusWidgetProps {
  scans: Scan[];
}

interface ActiveScan {
  scanId: string;
  projectName: string;
  status: string;
  pagesScanned: number;
  violationsFound: number;
  startedAt: string;
}

export function ScanStatusWidget({ scans }: ScanStatusWidgetProps) {
  const t = useTranslations('dash');
  const [activeScans, setActiveScans] = useState<ActiveScan[]>([]);

  // Track active scans (running/queued)
  useEffect(() => {
    const running = (scans || [])
      .filter((s) => s.status === 'running' || s.status === 'queued')
      .map((s) => ({
        scanId: s.id,
        projectName: s.project?.name || 'Unknown',
        status: s.status,
        pagesScanned: s.pagesScanned,
        violationsFound: s.violationsFound,
        startedAt: s.createdAt,
      }));
    setActiveScans(running);
  }, [scans]);

  const recentCompleted = (scans || [])
    .filter((s) => s.status === 'completed' || s.status === 'failed')
    .slice(0, 3);

  const hasActive = activeScans.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{t('liveScanStatus')}</CardTitle>
            {hasActive && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
            )}
          </div>
          <Badge variant="outline" className={hasActive ? 'text-blue-500 border-blue-500/20' : 'text-muted-foreground'}>
            {hasActive ? t('scanning') : t('idle')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Active Scans */}
        {hasActive && (
          <div className="space-y-4 mb-4">
            {activeScans.map((scan) => (
              <div key={scan.scanId} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    <span className="font-medium text-sm">{scan.projectName}</span>
                  </div>
                  <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/20">
                    {scan.status === 'queued' ? t('queued') : t('running')}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>{t('pages', { count: scan.pagesScanned })}</span>
                  <span>{t('violations', { count: scan.violationsFound })}</span>
                </div>
                <Progress value={scan.pagesScanned > 0 ? Math.min((scan.pagesScanned / 100) * 100, 95) : 10} className="h-1.5" />
              </div>
            ))}
          </div>
        )}

        {/* Recent Completed */}
        <div className="space-y-2">
          {recentCompleted.length > 0 && (
            <p className="text-xs text-muted-foreground font-medium mb-2">{t('recentActivity')}</p>
          )}
          {recentCompleted.map((scan) => (
            <div key={scan.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
              <div className={`p-1.5 rounded-lg ${scan.status === 'completed' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {scan.status === 'completed' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{scan.project?.name || 'Unknown'}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{t('violations', { count: scan.violationsFound })}</span>
                  <span>{scan.pagesScanned} {t('pagesUnit')}</span>
                </div>
              </div>
            </div>
          ))}

          {!hasActive && recentCompleted.length === 0 && (
            <div className="py-6 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('noActiveScans')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
