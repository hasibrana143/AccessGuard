'use client';

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, Loader2, XCircle, Clock, ExternalLink, CalendarClock, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCreateScan, useScans } from '@/hooks/useApi';
import { formatRelativeTime } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface ScheduledProject {
  id: string;
  name: string;
  url: string;
  nextScheduledScan: string;
  lastScanAt: string | null;
  riskScore: number | null;
  organization: { name: string };
}

export default function ScansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const orgSlug = user?.orgSlug ?? undefined;
  const { data: scans, isLoading } = useScans();
  const createScan = useCreateScan();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledProject[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(true);

  const handleRetry = async (projectId: string, projectName: string) => {
    setRetrying(projectId);
    try {
      const result = await createScan.mutateAsync(projectId);
      toast({
        title: 'Scan Restarted',
        description: `Found ${result?.scan?.violationsFound || 0} violations on "${projectName}".`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to retry scan';
      toast({ title: 'Scan Failed', description: errorMsg, variant: 'destructive' });
    } finally {
      setRetrying(null);
    }
  };

  const fetchScheduled = async () => {
    setScheduledLoading(true);
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
      setScheduledLoading(false);
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
        toast({ title: 'Schedule Removed', description: `${projectName} will no longer auto-scan` });
        fetchScheduled();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to remove schedule', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove schedule', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scan History</h1>
          <p className="text-muted-foreground">View all accessibility scan history</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-coral" />
            Scheduled Scans ({scheduled.length})
          </CardTitle>
          <CardDescription>Projects with automatic recurring scans</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduledLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : scheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No scheduled scans. Set a scan frequency when creating a project to enable automatic monitoring.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {scheduled.map((project) => (
                <div key={project.id} className="flex items-center gap-4 py-3">
                  <div className="p-2.5 rounded-lg bg-coral/10">
                    <CalendarClock className="h-5 w-5 text-coral" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium">{project.name}</span>
                      <Badge variant="outline" className="text-xs border-coral/20 text-coral">
                        Auto-scan
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Next: {new Date(project.nextScheduledScan).toLocaleDateString()} {new Date(project.nextScheduledScan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {project.lastScanAt && <span>Last: {formatRelativeTime(project.lastScanAt)}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleUnschedule(project.id, project.name)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {scans?.map((scan) => (
                <div key={scan.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className={`p-2.5 rounded-lg ${
                    scan.status === 'completed' ? 'bg-emerald-500/10' :
                    scan.status === 'running' ? 'bg-blue-500/10' :
                    scan.status === 'failed' ? 'bg-red-500/10' : 'bg-gray-500/10'
                  }`}>
                    {scan.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : scan.status === 'running' ? (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : scan.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{scan.project?.name || 'Unknown Project'}</span>
                      <Badge variant="outline" className={`text-xs ${
                        scan.status === 'completed' ? 'border-emerald-500/20 text-emerald-500' :
                        scan.status === 'running' ? 'border-blue-500/20 text-blue-500' :
                        scan.status === 'failed' ? 'border-red-500/20 text-red-500' : ''
                      }`}>
                        {scan.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{scan.pagesScanned} pages scanned</span>
                      <span>{scan.violationsFound} violations found</span>
                      <span>{formatRelativeTime(scan.createdAt)}</span>
                    </div>
                    {scan.status === 'failed' && scan.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{scan.errorMessage}</p>
                    )}
                  </div>
                  {scan.status === 'completed' && scan.summary && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        try {
                          const summary = typeof scan.summary === 'string' ? JSON.parse(scan.summary) : scan.summary;
                          return (
                            <>
                              {summary.critical > 0 && (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                  {summary.critical} critical
                                </Badge>
                              )}
                              {summary.serious > 0 && (
                                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                  {summary.serious} serious
                                </Badge>
                              )}
                            </>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  )}
                  {scan.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(scan.projectId, scan.project?.name || 'project')}
                      disabled={retrying === scan.projectId}
                    >
                      {retrying === scan.projectId ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Retry
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" aria-label="Open project website" onClick={() => scan.project?.url && window.open(scan.project.url, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!scans || scans.length === 0) && (
                <div className="py-16 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No scans yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
