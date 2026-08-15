'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, ChevronRight, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSeverityBadge } from '@/lib/constants';
import { SEVERITY_BG, SEVERITY_TEXT } from '@/lib/constants';
import type { Violation } from '@/types';
import { useRouter } from 'next/navigation';

interface RecentViolationsProps {
  violations: Violation[];
}

export function RecentViolations({ violations }: RecentViolationsProps) {
  const t = useTranslations('dash');
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('recentViolations')}</CardTitle>
            <CardDescription>{t('recentViolationsDesc')}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/violations')}>
            {t('viewAll')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.isArray(violations) && violations.slice(0, 5).map((v) => (
            <div
              key={v.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${SEVERITY_BG[v.severity]}`}>
                <AlertTriangle className={`h-4 w-4 ${SEVERITY_TEXT[v.severity]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{v.ruleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  <Badge variant="outline" className={`text-xs ${getSeverityBadge(v.severity)}`}>
                    {v.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{v.description}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span className="truncate">{v.url}</span>
                </div>
              </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push('/violations'); }}>{t('view')}</Button>
            </div>
          ))}
          {(!Array.isArray(violations) || violations.length === 0) && (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-50" />
              <p>{t('noViolations')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
