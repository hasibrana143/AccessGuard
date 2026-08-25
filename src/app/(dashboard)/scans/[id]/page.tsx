'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardNotFound } from '@/components/dashboard/not-found-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Layers,
  Shield,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Scan, Violation } from '@/types';

export default function ScanDetailPage() {
  const t = useTranslations('sdetail');
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const { data: scan, isLoading: scanLoading } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: async (): Promise<Scan | null> => {
      const result = await api.getScans(undefined, undefined, 100);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: Scan[] };
      const scans = responseData?.data || [];
      return scans.find((s) => s.id === scanId) || null;
    },
    retry: false,
  });

  const { data: violations = [], isLoading: violationsLoading } = useQuery({
    queryKey: ['violations', { scanId }],
    queryFn: async (): Promise<Violation[]> => {
      const result = await api.getViolations({ limit: 100 });
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: Violation[] };
      const allViolations = responseData?.data || [];
      return allViolations.filter((v) => v.scanId === scanId);
    },
    enabled: !!scanId,
    retry: false,
  });

  if (scanLoading) {
    return <ScanDetailSkeleton />;
  }

  if (!scan) {
    return <DashboardNotFound title={t('notFoundTitle')} description={t('notFoundDesc')} />;
  }

  const duration = scan.completedAt
    ? Math.round((new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000)
    : null;

  const severityCounts = violations.reduce(
    (acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statusCounts = violations.reduce(
    (acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/scans')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToScans')}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <Badge
              variant={
                scan.status === 'completed'
                  ? 'default'
                  : scan.status === 'failed'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {scan.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {scan.project?.name} • {scan.project?.url}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('pagesScanned')}</p>
                <p className="text-2xl font-bold">{scan.pagesScanned}</p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('violationsFound')}</p>
                <p className="text-2xl font-bold text-coral">{scan.violationsFound}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-coral/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('duration')}</p>
                <p className="text-2xl font-bold">
                  {duration !== null ? t('durationSeconds', { duration }) : '—'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fixRate')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {scan.violationsFound > 0
                    ? Math.round(((statusCounts.fixed || 0) / scan.violationsFound) * 100)
                    : 0}
                  %
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-600/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="violations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="violations">{t('tabViolations', { count: violations.length })}</TabsTrigger>
          <TabsTrigger value="summary">{t('tabSummary')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('tabTimeline')}</TabsTrigger>
        </TabsList>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-4">
          {violationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : violations.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t('noViolationsInScan')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {violations.map((violation) => (
                <Card
                  key={violation.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/violations/${violation.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              violation.severity === 'critical'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {violation.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {violation.ruleId}
                          </span>
                          {violation.wcagCriteria && (
                            <span className="text-xs text-muted-foreground">
                              {t('wcagCriteria', { criteria: violation.wcagCriteria })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{violation.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {violation.url}
                        </p>
                        {violation.elementHtml && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                            {violation.elementHtml}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={violation.status === 'open' ? 'destructive' : 'secondary'}>
                          {violation.status}
                        </Badge>
                        {violation.aiConfidenceScore && (
                          <span className="text-xs text-muted-foreground">
                            {t('confidencePercent', { percent: Math.round(violation.aiConfidenceScore * 100) })}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('severityBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['critical', 'serious', 'moderate', 'minor'] as const).map((sev) => (
                  <div key={sev} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          sev === 'critical'
                            ? 'bg-red-500'
                            : sev === 'serious'
                            ? 'bg-orange-500'
                            : sev === 'moderate'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span className="capitalize">{sev}</span>
                    </div>
                    <span className="font-medium">{severityCounts[sev] ?? 0}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('statusBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['open', 'fixed', 'ignored', 'false_positive'] as const).map((status) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                    <span className="font-medium">{statusCounts[status] ?? 0}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {scan.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('scanSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{scan.summary}</p>
              </CardContent>
            </Card>
          )}

          {scan.errorMessage && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">{t('error')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{scan.errorMessage}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('scanTimeline')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{t('scanStarted')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(scan.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {scan.completedAt && (
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{t('scanCompleted')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(scan.completedAt).toLocaleString()}
                      </p>
                      {duration !== null && (
                        <p className="text-xs text-muted-foreground">
                          {t('durationSecondsFull', { duration })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {scan.status === 'failed' && scan.errorMessage && (
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-destructive">{t('scanFailed')}</p>
                      <p className="text-sm text-destructive">{scan.errorMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScanDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
