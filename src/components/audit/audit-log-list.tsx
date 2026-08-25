'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ScrollText, LogIn, LogOut, UserPlus, UserX, Globe, ScanLine, Bug, Settings, Github, FileText, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/constants';

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

const ACTION_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  'user_login': { icon: LogIn, color: 'text-emerald-500 bg-emerald-500/10' },
  'user_logout': { icon: LogOut, color: 'text-muted-foreground bg-muted' },
  'user_invited': { icon: UserPlus, color: 'text-blue-500 bg-blue-500/10' },
  'user_removed': { icon: UserX, color: 'text-red-500 bg-red-500/10' },
  'project_created': { icon: Globe, color: 'text-coral bg-coral/10' },
  'project_updated': { icon: Globe, color: 'text-coral bg-coral/10' },
  'project_deleted': { icon: Globe, color: 'text-red-500 bg-red-500/10' },
  'scan_started': { icon: ScanLine, color: 'text-blue-500 bg-blue-500/10' },
  'scan_completed': { icon: ScanLine, color: 'text-emerald-500 bg-emerald-500/10' },
  'scan_failed': { icon: ScanLine, color: 'text-red-500 bg-red-500/10' },
  'scan_scheduled': { icon: ScanLine, color: 'text-blue-500 bg-blue-500/10' },
  'scan_unscheduled': { icon: ScanLine, color: 'text-muted-foreground bg-muted' },
  'violation_status_changed': { icon: Bug, color: 'text-orange-500 bg-orange-500/10' },
  'violation_fixed': { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
  'settings_updated': { icon: Settings, color: 'text-muted-foreground bg-muted' },
  'subscription_changed': { icon: Settings, color: 'text-purple-500 bg-purple-500/10' },
  'subscription_created': { icon: Settings, color: 'text-purple-500 bg-purple-500/10' },
  'subscription_cancelled': { icon: Settings, color: 'text-red-500 bg-red-500/10' },
  'github_connected': { icon: Github, color: 'text-muted-foreground bg-muted' },
  'github_disconnected': { icon: Github, color: 'text-red-500 bg-red-500/10' },
  'report_generated': { icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  'api_key_regenerated': { icon: ShieldCheck, color: 'text-coral bg-coral/10' },
  'email_verified': { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
  'mfa_enabled': { icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-500/10' },
  'mfa_disabled': { icon: ShieldCheck, color: 'text-red-500 bg-red-500/10' },
  'executive_summary_generated': { icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  'password_changed': { icon: ShieldCheck, color: 'text-coral bg-coral/10' },
  'invite_sent': { icon: UserPlus, color: 'text-blue-500 bg-blue-500/10' },
  'sso_config_updated': { icon: ShieldCheck, color: 'text-blue-500 bg-blue-500/10' },
  'sso_config_removed': { icon: ShieldCheck, color: 'text-red-500 bg-red-500/10' },
  'scim_token_generated': { icon: ShieldCheck, color: 'text-coral bg-coral/10' },
  'scim_user_created': { icon: UserPlus, color: 'text-blue-500 bg-blue-500/10' },
  'scim_user_deactivated': { icon: UserX, color: 'text-muted-foreground bg-muted' },
  'vendor_review': { icon: FileText, color: 'text-orange-500 bg-orange-500/10' },
};

export const ACTION_LABELS = Object.keys(ACTION_META);

interface AuditLogListProps {
  logs: AuditLogEntry[];
  isLoading: boolean;
}

export function AuditLogList({ logs, isLoading }: AuditLogListProps) {
  const t = useTranslations('audit');

  const actionLabel = (action: string) => {
    const label = t(`actions.${action}`);
    return label && !label.startsWith('actions.') ? label : action.replace(/_/g, ' ');
  };

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('noEvents')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const meta = ACTION_META[log.action] || {
                icon: ScrollText,
                color: 'text-muted-foreground bg-muted',
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
                      <span className="font-medium text-sm">{actionLabel(log.action)}</span>
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
  );
}
