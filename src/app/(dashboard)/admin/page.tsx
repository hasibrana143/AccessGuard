'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Shield, Users, Building2, Activity, Loader2, RefreshCw, Database, Server,
  Cpu, ScrollText, CheckCircle2, XCircle, AlertTriangle, UserCog
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeTime } from '@/lib/constants';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  mfaEnabledAt: string | null;
}

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  _count: { users: number; projects: number };
}

interface RecentScan {
  id: string;
  status: string;
  pagesScanned: number;
  violationsFound: number;
  createdAt: string;
  project: { name: string };
}

interface AdminData {
  users: AdminUser[];
  orgs: AdminOrg[];
  usage: { projects: number; scans: number; violations: number; auditLogs: number; scansThisWeek: number };
  health: { database: string; redis: string; api: string; worker: string };
  recentScans: RecentScan[];
  flags: Record<string, boolean>;
}

function HealthBadge({ status }: { status: string }) {
  const ok = status === 'ok';
  return (
    <Badge variant="outline" className={`text-xs ${ok ? 'border-emerald-500/30 text-emerald-500' : 'border-orange-500/30 text-orange-500'}`}>
      {ok ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
}

export default function AdminPage() {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [flagUpdating, setFlagUpdating] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.flags) setFlags(json.data.flags);
      } else {
        toast({ title: tc('error'), description: json.error || t('loadFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('loadFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleSetRole = async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-role', userId, role }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: t('roleUpdated'), description: t('roleUpdatedMsg', { role }) });
        fetchData();
      } else {
        toast({ title: tc('error'), description: json.error || t('roleUpdateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('roleUpdateFailed'), variant: 'destructive' });
    }
  };

  const handleToggleFlag = async (flag: string, enabled: boolean) => {
    setFlagUpdating(flag);
    try {
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-flag', flag, enabled }),
      });
      const json = await res.json();
      if (json.success) {
        setFlags(prev => ({ ...prev, [flag]: enabled }));
        toast({ title: enabled ? t('enabled') : t('disabled'), description: t('flagToggled', { flag, state: enabled ? t('enabled') : t('disabled') }) });
      } else {
        toast({ title: tc('error'), description: json.error || t('flagUpdateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('flagUpdateFailed'), variant: 'destructive' });
    } finally {
      setFlagUpdating(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <h1 className="text-xl font-bold mb-1">{t('adminRequired')}</h1>
          <p className="text-sm text-muted-foreground">{t('adminRequiredMsg')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-coral" />
                  {t('systemHealth')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: t('database'), icon: Database, value: data?.health.database },
                  { label: t('redisQueue'), icon: Server, value: data?.health.redis },
                  { label: t('api'), icon: Cpu, value: data?.health.api },
                  { label: t('worker'), icon: Activity, value: data?.health.worker },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <row.icon className="h-4 w-4 text-muted-foreground" />
                      {row.label}
                    </div>
                    <HealthBadge status={row.value || t('unknown')} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-coral" />
                  {t('usageAnalytics')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t('projects'), value: data?.usage.projects },
                    { label: t('scans'), value: data?.usage.scans },
                    { label: t('violations'), value: data?.usage.violations },
                    { label: t('auditEvents'), value: data?.usage.auditLogs },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{s.value ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {t('scansLast7d', { count: data?.usage.scansThisWeek ?? 0 })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-coral" />
                  {t('organizations')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data?.orgs.map((org) => (
                  <div key={org.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{org.name}</span>
                      <Badge variant="outline" className="text-xs">{org.plan}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('orgCounts', { users: org._count.users, projects: org._count.projects, slug: org.slug })}
                    </p>
                  </div>
                ))}
                {(!data?.orgs || data.orgs.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('noOrganizations')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-coral" />
                {t('userManagement')}
              </CardTitle>
              <CardDescription>{t('userManagementDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {data?.users.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 p-4">
                    <div className="p-2.5 rounded-lg bg-muted flex-shrink-0">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{u.name || t('unnamed')}</span>
                        <Badge variant="outline" className="text-xs">{u.role}</Badge>
                        {u.emailVerifiedAt && (
                          <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-500">{t('verified')}</Badge>
                        )}
                        {u.mfaEnabledAt && (
                          <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-500">{t('mfa')}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t('joined', { email: u.email, date: formatRelativeTime(u.createdAt) })}</p>
                    </div>
                    <Select value={u.role} onValueChange={(role) => handleSetRole(u.id, role)}>
                      <SelectTrigger className="w-28" aria-label={t('roleAria', { email: u.email })}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">{t('admin')}</SelectItem>
                        <SelectItem value="member">{t('member')}</SelectItem>
                        <SelectItem value="viewer">{t('viewer')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {(!data?.users || data.users.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('noUsers')}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-coral" />
                {t('featureFlags')}
              </CardTitle>
              <CardDescription>{t('featureFlagsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'scanner.ai_remediation', label: t('flagAi'), description: t('flagAiDesc') },
                { key: 'scheduler.automation', label: t('flagScheduled'), description: t('flagScheduledDesc') },
                { key: 'auth.github', label: t('flagGithub'), description: t('flagGithubDesc') },
                { key: 'notifications.email', label: t('flagEmail'), description: t('flagEmailDesc') },
              ].map((flag) => (
                <div key={flag.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{flag.label}</p>
                    <p className="text-xs text-muted-foreground">{flag.description}</p>
                  </div>
                  <Switch
                    checked={flags[flag.key]}
                    onCheckedChange={(enabled) => handleToggleFlag(flag.key, enabled)}
                    disabled={flagUpdating === flag.key}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-coral" />
                {t('recentScans')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {data?.recentScans.map((scan) => (
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
                {(!data?.recentScans || data.recentScans.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">{t('noScans')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
