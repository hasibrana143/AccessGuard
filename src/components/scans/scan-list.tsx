'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, CheckCircle2, Loader2, XCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCreateScan } from '@/hooks/useApi';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeTime } from '@/lib/constants';
import type { Scan } from '@/types';

interface ScanListProps {
  scans: Scan[] | undefined;
  isLoading: boolean;
}

export function ScanList({ scans, isLoading }: ScanListProps) {
  const t = useTranslations('scans');
  const { toast } = useToast();
  const createScan = useCreateScan();
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (projectId: string, projectName: string) => {
    setRetrying(projectId);
    try {
      const result = await createScan.mutateAsync(projectId);
      toast({
        title: t('scanRestarted'),
        description: t('scanRestartedMsg', { count: result?.scan?.violationsFound || 0, name: projectName }),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('retryFailed');
      toast({ title: t('scanFailed'), description: errorMsg, variant: 'destructive' });
    } finally {
      setRetrying(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {scans?.map((scan) => (
              <div key={scan.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2.5 rounded-lg shrink-0 ${
                    scan.status === 'completed' ? 'bg-emerald-500/10' :
                    scan.status === 'running' ? 'bg-blue-500/10' :
                    scan.status === 'failed' ? 'bg-red-500/10' : 'bg-muted'
                  }`}>
                    {scan.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : scan.status === 'running' ? (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : scan.status === 'failed' ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{scan.project?.name || t('unknownProject')}</span>
                      <Badge variant="outline" className={`text-xs shrink-0 ${
                        scan.status === 'completed' ? 'border-emerald-500/20 text-emerald-500' :
                        scan.status === 'running' ? 'border-blue-500/20 text-blue-500' :
                        scan.status === 'failed' ? 'border-red-500/20 text-red-500' : ''
                      }`}>
                        {scan.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{t('pagesScanned', { count: scan.pagesScanned })}</span>
                      <span>{t('violationsFound', { count: scan.violationsFound })}</span>
                      <span>{formatRelativeTime(scan.createdAt)}</span>
                    </div>
                    {scan.status === 'failed' && scan.errorMessage && (
                      <p className="text-xs text-destructive mt-1 line-clamp-2">{scan.errorMessage}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {scan.status === 'completed' && scan.summary && (
                    <div className="hidden sm:flex items-center gap-2">
                      {(() => {
                        try {
                          const summary = typeof scan.summary === 'string' ? JSON.parse(scan.summary) : scan.summary;
                          return (
                            <>
                              {summary.critical > 0 && (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                  {t('criticalCount', { count: summary.critical })}
                                </Badge>
                              )}
                              {summary.serious > 0 && (
                                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                  {t('seriousCount', { count: summary.serious })}
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
                      onClick={() => handleRetry(scan.projectId, scan.project?.name || t('unknownProject'))}
                      disabled={retrying === scan.projectId}
                    >
                      {retrying === scan.projectId ? (
                        <Loader2 className="h-4 w-4 sm:mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 sm:mr-1" />
                      )}
                      <span className="hidden sm:inline">{t('retry')}</span>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" aria-label={t('openProject')} onClick={() => scan.project?.url && window.open(scan.project.url, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {(!scans || scans.length === 0) && (
              <div className="py-16 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('noScans')}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
