'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

const FLAGS = [
  { key: 'scanner.ai_remediation', label: 'AI Remediation', description: 'AI-generated fix code for violations' },
  { key: 'scheduler.automation', label: 'Scheduled Scans', description: 'Automatic recurring scans' },
  { key: 'auth.github', label: 'GitHub Integration', description: 'GitHub OAuth login and PR creation' },
  { key: 'notifications.email', label: 'Email Notifications', description: 'Scan and alert emails' },
];

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
        toast({ title: 'Error', description: json.error || 'Failed to load admin data', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load admin data', variant: 'destructive' });
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
        toast({ title: 'Role Updated', description: `User role changed to ${role}` });
        fetchData();
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to update role', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
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
        toast({ title: enabled ? 'Enabled' : 'Disabled', description: `${flag} ${enabled ? 'enabled' : 'disabled'}` });
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to update flag', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update flag', variant: 'destructive' });
    } finally {
      setFlagUpdating(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <h1 className="text-xl font-bold mb-1">Admin Access Required</h1>
          <p className="text-sm text-muted-foreground">Only admins can view this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">System health, users, and organization management</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
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
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Database', icon: Database, value: data?.health.database },
                  { label: 'Redis Queue', icon: Server, value: data?.health.redis },
                  { label: 'API', icon: Cpu, value: data?.health.api },
                  { label: 'Worker', icon: Activity, value: data?.health.worker },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <row.icon className="h-4 w-4 text-muted-foreground" />
                      {row.label}
                    </div>
                    <HealthBadge status={row.value || 'unknown'} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-coral" />
                  Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Projects', value: data?.usage.projects },
                    { label: 'Scans', value: data?.usage.scans },
                    { label: 'Violations', value: data?.usage.violations },
                    { label: 'Audit Events', value: data?.usage.auditLogs },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{s.value ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {data?.usage.scansThisWeek ?? 0} scans in the last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-coral" />
                  Organizations
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
                      {org._count.users} users · {org._count.projects} projects · {org.slug}
                    </p>
                  </div>
                ))}
                {(!data?.orgs || data.orgs.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No organizations</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-coral" />
                User Management
              </CardTitle>
              <CardDescription>Manage team members and roles</CardDescription>
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
                        <span className="font-medium text-sm truncate">{u.name || 'Unnamed'}</span>
                        <Badge variant="outline" className="text-xs">{u.role}</Badge>
                        {u.emailVerifiedAt && (
                          <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-500">verified</Badge>
                        )}
                        {u.mfaEnabledAt && (
                          <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-500">MFA</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email} · joined {formatRelativeTime(u.createdAt)}</p>
                    </div>
                    <Select value={u.role} onValueChange={(role) => handleSetRole(u.id, role)}>
                      <SelectTrigger className="w-28" aria-label={`Role for ${u.email}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {(!data?.users || data.users.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-coral" />
                Feature Flags
              </CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FLAGS.map((flag) => (
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
                Recent Scans
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
                        {scan.pagesScanned} pages · {scan.violationsFound} violations · {formatRelativeTime(scan.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{scan.status}</Badge>
                  </div>
                ))}
                {(!data?.recentScans || data.recentScans.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">No scans yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
