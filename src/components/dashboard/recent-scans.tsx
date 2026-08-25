'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Activity, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScanProgressAnimation } from '@/components/ui/scan-progress-animation';
import { formatRelativeTime } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import type { Scan } from '@/types';

interface RecentScansProps {
  scans: Scan[];
}

export function RecentScans({ scans }: RecentScansProps) {
  const t = useTranslations('dash');
  const { toast } = useToast();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('recentScans')}</CardTitle>
            <CardDescription>{t('recentScansDesc')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast({ title: t('comingSoon'), description: t('fullHistorySoon') })}>
            {t('viewAll')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.isArray(scans) && scans.slice(0, 5).map((scan) => (
            <div
              key={scan.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <ScanProgressAnimation
                status={scan.status as 'pending' | 'running' | 'completed' | 'failed'}
                pagesScanned={scan.pagesScanned}
                violationsFound={scan.violationsFound}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{scan.project?.name || t('unknown')}</span>
                  <Badge variant="outline" className={`text-xs ${
                    scan.status === 'completed' ? 'text-emerald-500' :
                    scan.status === 'running' ? 'text-blue-500' :
                    scan.status === 'failed' ? 'text-red-500' : ''
                  }`}>
                    {scan.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{formatRelativeTime(scan.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
          {(!Array.isArray(scans) || scans.length === 0) && (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('noScans')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
