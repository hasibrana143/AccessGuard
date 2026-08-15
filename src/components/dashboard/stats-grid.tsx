'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Target, AlertTriangle, AlertCircle, Globe, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRiskGradient, getRiskColor, getRiskLabel } from '@/lib/constants';

interface StatsGridProps {
  avgRiskScore: number;
  stats: { critical: number; serious: number; moderate: number; minor: number; total: number };
  projectsCount: number;
}

export function StatsGrid({ avgRiskScore, stats, projectsCount }: StatsGridProps) {
  const t = useTranslations('dash');
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getRiskGradient(avgRiskScore)}`} />
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('avgRiskScore')}</p>
              <p className={`text-3xl font-bold mt-1 ${getRiskColor(avgRiskScore)}`}>
                {avgRiskScore}<span className="text-lg text-muted-foreground">/100</span>
              </p>
              <Badge variant="outline" className={`mt-2 ${getRiskColor(avgRiskScore)}`}>
                {getRiskLabel(avgRiskScore)}
              </Badge>
            </div>
            <div className={`p-3 rounded-xl ${avgRiskScore >= 60 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <Target className={`h-6 w-6 ${getRiskColor(avgRiskScore)}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('openViolations')}</p>
              <p className="text-3xl font-bold mt-1">{stats.total}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
                <TrendingDown className="h-3 w-3" />
                <span>{t('fromLastWeek', { percent: 12 })}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/10">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('criticalIssues')}</p>
              <p className="text-3xl font-bold mt-1 text-red-500">{stats.critical}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>{t('requiresAttention')}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/10">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t('projects')}</p>
              <p className="text-3xl font-bold mt-1">{projectsCount}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span>{t('activeMonitoring')}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-coral/10">
              <Globe className="h-6 w-6 text-coral" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
