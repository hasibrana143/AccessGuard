'use client';

import React from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { useProjects, useViolationStats, useViolations, useScans, useTrendData } from '@/hooks/useApi';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { SeverityPie } from '@/components/dashboard/severity-pie';
import { RecentViolations } from '@/components/dashboard/recent-violations';
import { RecentScans } from '@/components/dashboard/recent-scans';
import { RegressionAlerts } from '@/components/dashboard/regression-alerts';
import { AIFixRate } from '@/components/dashboard/ai-fix-rate';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const orgSlug = user?.orgSlug ?? undefined;
  const { data: projects, isLoading: projectsLoading } = useProjects(orgSlug);
  const { data: statsData } = useViolationStats(undefined, user?.orgSlug ?? undefined);
  const { data: violationsData } = useViolations({ limit: 5 });
  const { data: scansData } = useScans(undefined, 5);
  const { data: trendData } = useTrendData(undefined, 30);

  const stats = statsData?.severity || { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 };
  const avgRiskScore = projects && projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.riskScore || 0), 0) / projects.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            window.open('/api/violations/export', '_blank');
          }}>
            <Download className="h-4 w-4 mr-2" />
            {t('exportCsv')}
          </Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={async () => {
            try {
              const res = await fetch('/api/projects');
              const data = await res.json();
              if (data.success && data.data) {
                const projects = data.data;
                let count = 0;
                for (const p of projects) {
                  await fetch('/api/scans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: p.id }),
                  });
                  count++;
                }
                toast({ title: t('title'), description: t('scansStarted', { count }) });
              }
            } catch {
              toast({ title: tc('error'), description: t('failedStartScans'), variant: 'destructive' });
            }
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('scanAll')}
          </Button>
        </div>
      </div>

      <StatsGrid avgRiskScore={avgRiskScore} stats={stats} projectsCount={projects?.length || 0} />

      <div className="grid gap-6 lg:grid-cols-3">
        <TrendChart trendData={trendData || []} />
        <SeverityPie stats={stats} />
        <AIFixRate fixRate={statsData?.fixRate} />
      </div>

      <RegressionAlerts projects={projects || []} />

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentViolations violations={violationsData || []} />
        <RecentScans scans={scansData || []} />
      </div>
    </div>
  );
}
