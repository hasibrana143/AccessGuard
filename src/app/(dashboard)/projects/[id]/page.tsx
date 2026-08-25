'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useProject } from '@/hooks/useProjects';
import { useScans } from '@/hooks/useScans';
import { useViolations } from '@/hooks/useViolations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardNotFound } from '@/components/dashboard/not-found-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ExternalLink,
  Shield,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectDetailPage() {
  const t = useTranslations('pdetail');
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: scans = [], isLoading: scansLoading } = useScans(projectId, 10);
  const { data: violations = [], isLoading: violationsLoading } = useViolations({ projectId, limit: 20 });

  if (projectLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return <DashboardNotFound title={t('notFoundTitle')} description={t('notFoundDesc')} />;
  }

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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/projects')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToProjects')}
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4 shrink-0" />
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-1 truncate"
            >
              {project.url}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('runScan')}</span>
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('settings')}</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('riskScore')}</p>
                <p className="text-2xl font-bold">{project.riskScore ?? '—'}</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('totalScans')}</p>
                <p className="text-2xl font-bold">{scans.length}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('openViolations')}</p>
                <p className="text-2xl font-bold text-coral">{statusCounts.open ?? 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-coral/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('fixed')}</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.fixed ?? 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('tabOverview')}</TabsTrigger>
          <TabsTrigger value="scans">{t('tabScans', { count: scans.length })}</TabsTrigger>
          <TabsTrigger value="violations">{t('tabViolations', { count: violations.length })}</TabsTrigger>
          <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('projectInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('created')}</span>
                  <span>{t('timeAgo', { time: formatDistanceToNow(new Date(project.createdAt)) })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('lastScan')}</span>
                  <span>
                    {project.lastScanAt
                      ? t('timeAgo', { time: formatDistanceToNow(new Date(project.lastScanAt)) })
                      : t('never')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('nextScheduled')}</span>
                  <span>
                    {project.nextScheduledScan
                      ? formatDistanceToNow(new Date(project.nextScheduledScan))
                      : t('notScheduled')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('status')}</span>
                  <Badge variant={project.isActive ? 'default' : 'secondary'}>
                    {project.isActive ? t('active') : t('inactive')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('violationSummary')}</CardTitle>
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
          </div>
        </TabsContent>

        {/* Scans Tab */}
        <TabsContent value="scans" className="space-y-4">
          {scansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : scans.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t('noScansYet')}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scans.map((scan) => (
                <Card
                  key={scan.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/scans/${scan.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            scan.status === 'completed'
                              ? 'bg-green-100 text-green-600'
                              : scan.status === 'failed'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {scan.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : scan.status === 'failed' ? (
                            <AlertTriangle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {t('pagesScannedCount', { count: scan.pagesScanned })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('violationsFoundCount', { count: scan.violationsFound })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{t('timeAgo', { time: formatDistanceToNow(new Date(scan.startedAt)) })}</p>
                        <Badge variant={scan.status === 'completed' ? 'default' : 'secondary'}>
                          {scan.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
                {t('noViolationsYet')}
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
                        </div>
                        <p className="text-sm truncate">{violation.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {violation.url}
                        </p>
                      </div>
                      <Badge variant={violation.status === 'open' ? 'destructive' : 'secondary'}>
                        {violation.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('projectSettings')}</CardTitle>
              <CardDescription>{t('projectSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t('projectSettingsComingSoon')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectDetailSkeleton() {
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
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
