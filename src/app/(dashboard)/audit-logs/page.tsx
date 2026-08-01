'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ScrollText, Filter, RefreshCw, ShieldCheck, Globe, ScanLine, Bug, Settings as SettingsIcon, Github, FileText, LogIn, LogOut, UserPlus, UserX, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { formatRelativeTime } from '@/lib/constants';

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

const ACTION_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'user.login': { label: 'User Logged In', icon: LogIn, color: 'text-emerald-500 bg-emerald-500/10' },
  'user.logout': { label: 'User Logged Out', icon: LogOut, color: 'text-gray-500 bg-gray-500/10' },
  'user.invited': { label: 'User Invited', icon: UserPlus, color: 'text-blue-500 bg-blue-500/10' },
  'user.removed': { label: 'User Removed', icon: UserX, color: 'text-red-500 bg-red-500/10' },
  'project.created': { label: 'Project Created', icon: Globe, color: 'text-coral bg-coral/10' },
  'project.updated': { label: 'Project Updated', icon: Globe, color: 'text-coral bg-coral/10' },
  'project.deleted': { label: 'Project Deleted', icon: Globe, color: 'text-red-500 bg-red-500/10' },
  'scan.started': { label: 'Scan Started', icon: ScanLine, color: 'text-blue-500 bg-blue-500/10' },
  'scan.completed': { label: 'Scan Completed', icon: ScanLine, color: 'text-emerald-500 bg-emerald-500/10' },
  'scan.failed': { label: 'Scan Failed', icon: ScanLine, color: 'text-red-500 bg-red-500/10' },
  'scan_scheduled': { label: 'Scan Scheduled', icon: ScanLine, color: 'text-blue-500 bg-blue-500/10' },
  'scan_unscheduled': { label: 'Scan Unscheduled', icon: ScanLine, color: 'text-gray-500 bg-gray-500/10' },
  'violation.status_changed': { label: 'Violation Updated', icon: Bug, color: 'text-orange-500 bg-orange-500/10' },
  'violation.fixed': { label: 'Violation Fixed', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
  'settings.updated': { label: 'Settings Updated', icon: SettingsIcon, color: 'text-gray-500 bg-gray-500/10' },
  'subscription.changed': { label: 'Subscription Changed', icon: SettingsIcon, color: 'text-purple-500 bg-purple-500/10' },
  'github.connected': { label: 'GitHub Connected', icon: Github, color: 'text-gray-500 bg-gray-500/10' },
  'github.disconnected': { label: 'GitHub Disconnected', icon: Github, color: 'text-red-500 bg-red-500/10' },
  'report.generated': { label: 'Report Generated', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  'api_key_regenerated': { label: 'API Key Regenerated', icon: ShieldCheck, color: 'text-coral bg-coral/10' },
  'email_verified': { label: 'Email Verified', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
  'mfa_enabled': { label: 'MFA Enabled', icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-500/10' },
  'mfa_disabled': { label: 'MFA Disabled', icon: ShieldCheck, color: 'text-red-500 bg-red-500/10' },
  'executive_summary_generated': { label: 'Executive Summary Generated', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  'password_changed': { label: 'Password Changed', icon: ShieldCheck, color: 'text-coral bg-coral/10' },
  'invite_sent': { label: 'Invite Sent', icon: UserPlus, color: 'text-blue-500 bg-blue-500/10' },
};

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (actionFilter !== 'all') params.append('action', actionFilter);
      const res = await fetch(`/api/audit-logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track security and activity events across your organization</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-56" aria-label="Filter by action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {Object.entries(ACTION_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              {total} events
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No audit events found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const meta = ACTION_META[log.action] || {
                  label: log.action.replace(/_/g, ' '),
                  icon: ScrollText,
                  color: 'text-gray-500 bg-gray-500/10',
                };
                const Icon = meta.icon;
                const details = Object.entries(log.metadata)
                  .filter(([key]) => !['timestamp', 'userId', 'userAgent', 'ip'].includes(key))
                  .map(([key, value]) => ({ key, value }));

                return (
                  <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={`p-2.5 rounded-lg flex-shrink-0 ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{meta.label}</span>
                        <Badge variant="outline" className="text-xs font-mono">{log.action}</Badge>
                      </div>
                      {details.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {details.map(d => (
                            <span key={d.key} className="mr-3">
                              <span className="text-foreground/60">{d.key}:</span>{' '}
                              {typeof d.value === 'object' ? JSON.stringify(d.value) : String(d.value)}
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {Math.min(page, totalPages)} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
