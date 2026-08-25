'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AdminOverview } from '@/components/admin/admin-overview';
import { AdminUsers } from '@/components/admin/admin-users';
import { FeatureFlags } from '@/components/admin/feature-flags';
import { RecentScansAdmin } from '@/components/admin/recent-scans-admin';

interface AdminData {
  users: Array<{ id: string; email: string; name: string | null; role: string; createdAt: string; emailVerifiedAt: string | null; mfaEnabledAt: string | null }>;
  orgs: Array<{ id: string; name: string; slug: string; plan: string; subscriptionStatus: string; createdAt: string; _count: { users: number; projects: number } }>;
  usage: { projects: number; scans: number; violations: number; auditLogs: number; scansThisWeek: number };
  health: { database: string; redis: string; api: string; worker: string };
  recentScans: Array<{ id: string; status: string; pagesScanned: number; violationsFound: number; createdAt: string; project: { name: string } }>;
  flags: Record<string, boolean>;
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

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin, fetchData]);

  const handleSetRole = async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set-role', userId, role }) });
      const json = await res.json();
      if (json.success) { toast({ title: t('roleUpdated'), description: t('roleUpdatedMsg', { role }) }); fetchData(); }
      else { toast({ title: tc('error'), description: json.error || t('roleUpdateFailed'), variant: 'destructive' }); }
    } catch { toast({ title: tc('error'), description: t('roleUpdateFailed'), variant: 'destructive' }); }
  };

  const handleToggleFlag = async (flag: string, enabled: boolean) => {
    setFlagUpdating(flag);
    try {
      const res = await fetch('/api/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set-flag', flag, enabled }) });
      const json = await res.json();
      if (json.success) {
        setFlags(prev => ({ ...prev, [flag]: enabled }));
        toast({ title: enabled ? t('enabled') : t('disabled'), description: t('flagToggled', { flag, state: enabled ? t('enabled') : t('disabled') }) });
      } else { toast({ title: tc('error'), description: json.error || t('flagUpdateFailed'), variant: 'destructive' }); }
    } catch { toast({ title: tc('error'), description: t('flagUpdateFailed'), variant: 'destructive' }); }
    finally { setFlagUpdating(null); }
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
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />{t('refresh')}
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <>
          <AdminOverview health={data.health} usage={data.usage} orgs={data.orgs} />
          <AdminUsers users={data.users} onRoleChange={handleSetRole} />
          <FeatureFlags flags={flags} flagUpdating={flagUpdating} onToggle={handleToggleFlag} />
          <RecentScansAdmin scans={data.recentScans} />
        </>
      ) : null}
    </div>
  );
}
