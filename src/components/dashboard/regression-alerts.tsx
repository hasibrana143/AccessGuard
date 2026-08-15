'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/types';

interface RegressionResult {
  hasComparison: boolean;
  regressions: number;
  resolved: number;
  latestScan: { violationsFound: number };
  previousScan: { violationsFound: number };
  newViolations: Array<{ ruleId: string; url: string; severity: string }>;
}

export function RegressionAlerts({ projects }: { projects: Project[] }) {
  const t = useTranslations('dash');
  const [results, setResults] = useState<Record<string, RegressionResult | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, RegressionResult | null> = {};
      for (const project of projects) {
        try {
          const res = await fetch(`/api/stats/regression?projectId=${encodeURIComponent(project.id)}`);
          const data = await res.json();
          if (data.success) map[project.id] = data.data;
        } catch {
          map[project.id] = null;
        }
      }
      if (!cancelled) {
        setResults(map);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projects]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-coral" />
            {t('regressionDetection')}
          </CardTitle>
          <CardDescription>{t('comparingScans')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const withComparison = projects.filter((p) => results[p.id]?.hasComparison);
  const totalRegressions = withComparison.reduce((acc, p) => acc + (results[p.id]?.regressions || 0), 0);
  const totalResolved = withComparison.reduce((acc, p) => acc + (results[p.id]?.resolved || 0), 0);

  if (withComparison.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-coral" />
            {t('regressionDetection')}
          </CardTitle>
          <CardDescription>{t('detectNewIssues')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('runTwoScans')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-coral" />
            {t('regressionDetection')}
          </CardTitle>
          {totalRegressions > 0 ? (
            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
              <TrendingUp className="h-3 w-3 mr-1" />
              {t('newBadge', { count: totalRegressions })}
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <TrendingDown className="h-3 w-3 mr-1" />
              {t('noRegressions')}
            </Badge>
          )}
        </div>
        <CardDescription>
          {totalResolved > 0
            ? t('resolvedSince', { count: totalResolved })
            : t('newIssuesSince')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {withComparison.map((project) => {
          const result = results[project.id]!;
          const isClean = result.regressions === 0;
          return (
            <div key={project.id} className="p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{project.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {result.previousScan.violationsFound} → {result.latestScan.violationsFound}
                  </span>
                  {isClean ? (
                    <TrendingDown className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {result.regressions > 0 ? (
                <ul className="space-y-1.5">
                  {result.newViolations.slice(0, 4).map((v, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <Minus className="h-3 w-3 mt-0.5 shrink-0 text-red-500" />
                      <span>
                        <span className="text-red-500 capitalize">{v.severity}</span> — {v.ruleId} {t('on')} {v.url}
                      </span>
                    </li>
                  ))}
                  {result.regressions > 4 && (
                    <li className="text-xs text-muted-foreground pl-5">
                      {t('more', { count: result.regressions - 4 })}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-emerald-500">
                  {result.resolved > 0 ? t('fixedSince', { count: result.resolved }) : t('allClear')}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
