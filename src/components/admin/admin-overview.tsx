'use client';

import { useTranslations } from 'next-intl';
import { Database, Server, Cpu, Activity, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function HealthBadge({ status }: { status: string }) {
  const ok = status === 'ok';
  return (
    <Badge variant="outline" className={`text-xs ${ok ? 'border-emerald-500/30 text-emerald-500' : 'border-orange-500/30 text-orange-500'}`}>
      {ok ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
}

interface AdminOverviewProps {
  health: { database: string; redis: string; api: string; worker: string };
  usage: { projects: number; scans: number; violations: number; auditLogs: number; scansThisWeek: number };
  orgs: Array<{ id: string; name: string; slug: string; plan: string; _count: { users: number; projects: number } }>;
}

export function AdminOverview({ health, usage, orgs }: AdminOverviewProps) {
  const t = useTranslations('admin');

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-coral" />{t('systemHealth')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: t('database'), icon: Database, value: health.database },
            { label: t('redisQueue'), icon: Server, value: health.redis },
            { label: t('api'), icon: Cpu, value: health.api },
            { label: t('worker'), icon: Activity, value: health.worker },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <row.icon className="h-4 w-4 text-muted-foreground" />{row.label}
              </div>
              <HealthBadge status={row.value || t('unknown')} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-coral" />{t('usageAnalytics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('projects'), value: usage.projects },
              { label: t('scans'), value: usage.scans },
              { label: t('violations'), value: usage.violations },
              { label: t('auditEvents'), value: usage.auditLogs },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{s.value ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t('scansLast7d', { count: usage.scansThisWeek ?? 0 })}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-coral" />{t('organizations')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orgs.map((org) => (
            <div key={org.id} className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{org.name}</span>
                <Badge variant="outline" className="text-xs">{org.plan}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{t('orgCounts', { users: org._count.users, projects: org._count.projects, slug: org.slug })}</p>
            </div>
          ))}
          {orgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('noOrganizations')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
