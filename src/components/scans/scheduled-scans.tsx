'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarClock, Loader2, Trash2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeTime } from '@/lib/constants';

interface ScheduledProject {
  id: string;
  name: string;
  url: string;
  nextScheduledScan: string;
  lastScanAt: string | null;
  riskScore: number | null;
  organization: { name: string };
}

export function ScheduledScans() {
  const t = useTranslations('scans');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();
  const [scheduled, setScheduled] = useState<ScheduledProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduled = async () => {
    setLoading(true);
    try {
      const orgId = user?.orgId;
      const res = await fetch(`/api/schedule${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`);
      const data = await res.json();
      if (data.success) {
        setScheduled(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, [user?.orgId]);

  const handleUnschedule = async (projectId: string, projectName: string) => {
    try {
      const res = await fetch(`/api/schedule?projectId=${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('scheduleRemoved'), description: t('scheduleRemovedMsg', { name: projectName }) });
        fetchScheduled();
      } else {
        toast({ title: tc('error'), description: data.error || t('scheduleRemoveFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('scheduleRemoveFailed'), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClock className="h-5 w-5 text-coral" />
          {t('scheduledScans', { count: scheduled.length })}
        </CardTitle>
        <CardDescription>{t('scheduledDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('noScheduled')}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {scheduled.map((project) => (
              <div key={project.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-lg bg-coral/10">
                    <CalendarClock className="h-5 w-5 text-coral" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium truncate">{project.name}</span>
                      <Badge variant="outline" className="text-xs border-coral/20 text-coral shrink-0">
                        {t('autoScan')}
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {t('next')} {new Date(project.nextScheduledScan).toLocaleDateString()} {new Date(project.nextScheduledScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {project.lastScanAt && <span>{t('last')} {formatRelativeTime(project.lastScanAt)}</span>}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive self-end sm:self-center"
                  onClick={() => handleUnschedule(project.id, project.name)}
                >
                  <Trash2 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{t('remove')}</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
