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
  Download,
  Share2,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Printer,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Report {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  type: string;
  status: string;
  createdAt: string;
  summary?: string;
  data?: {
    violations?: Array<{
      ruleId: string;
      severity: string;
      count: number;
    }>;
    complianceScore?: number;
    totalViolations?: number;
  };
}

export default function ReportDetailPage() {
  const t = useTranslations('rdetail');
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async (): Promise<Report | null> => {
      const result = await api.getProjects();
      if (!result.success) return null;
      
      // Fetch reports list and find this one
      const reportsRes = await fetch(`/api/reports/list`);
      const reportsData = await reportsRes.json();
      if (!reportsData.success) return null;
      
      const reports = reportsData.data || [];
      return reports.find((r: Report) => r.id === reportId) || null;
    },
    retry: false,
  });

  if (isLoading) {
    return <ReportDetailSkeleton />;
  }

  if (!report) {
    return <DashboardNotFound title={t('notFoundTitle')} description={t('notFoundDesc')} />;
  }

  const violations = report.data?.violations || [];
  const complianceScore = report.data?.complianceScore ?? 0;
  const totalViolations = report.data?.totalViolations ?? 0;

  const severityColors: Record<string, string> = {
    critical: '#c0281d',
    serious: '#c2410c',
    moderate: '#eab308',
    minor: '#1d4ed8',
  };

  const pieData = violations.map((v) => ({
    name: v.severity,
    value: v.count,
    color: severityColors[v.severity] || '#888',
  }));

  const handleDownload = async (format: 'pdf' | 'json' | 'csv') => {
    if (format === 'pdf') {
      window.open(`/api/reports/download?id=${reportId}`, '_blank');
    } else if (format === 'json') {
      const dataStr = JSON.stringify(report, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title || 'report'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const csvContent = [
        ['Rule ID', 'Severity', 'Count'].join(','),
        ...violations.map((v) => [v.ruleId, v.severity, v.count].join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title || 'report'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      const res = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        navigator.clipboard.writeText(data.data.url);
        alert(t('shareCopied'));
      }
    } catch {
      alert(t('shareFailed'));
    }
  };

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Header - hidden on print */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 no-print">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/reports')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToReports')}
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{report.title}</h1>
          <p className="text-muted-foreground">
            {report.projectName} • {t('timeAgo', { time: formatDistanceToNow(new Date(report.createdAt)) })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('print')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('share')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('pdf')}</span>
          </Button>
        </div>
      </div>

      {/* Print Header - only visible on print */}
      <div className="hidden print:block print:mb-8">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">{report.title}</h1>
            <p className="text-gray-600">{report.projectName}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{t('generatedOn', { date: new Date(report.createdAt).toLocaleDateString() })}</p>
            <p>{t('complianceReportName')}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('complianceScore')}</p>
                <p className="text-3xl font-bold text-emerald-600">{complianceScore}%</p>
              </div>
              <Shield className="h-8 w-8 text-emerald-600/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('totalViolations')}</p>
                <p className="text-3xl font-bold">{totalViolations}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('reportType')}</p>
                <p className="text-xl font-semibold capitalize">{report.type}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="overflow-x-auto scrollbar-none">
          <TabsTrigger value="overview">{t('tabOverview')}</TabsTrigger>
          <TabsTrigger value="violations">{t('tabViolations', { count: violations.length })}</TabsTrigger>
          <TabsTrigger value="actions">{t('tabActions')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('severityDistribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    {t('noViolationData')}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground capitalize">{item.name}</div>
                        <div className="text-sm font-semibold">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('executiveSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200">{t('complianceStatus')}</span>
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      {complianceScore >= 80
                        ? t('complianceGood')
                        : t('complianceNeedsAttention')}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">{t('reportCovers')}</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{t('coversWcag')}</li>
                      <li>{t('coversViolations', { count: totalViolations })}</li>
                      <li>{t('coversAiRemediation')}</li>
                      <li>{t('coversGeneratedOn', { date: new Date(report.createdAt).toLocaleDateString() })}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations" className="space-y-4">
          {violations.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                <h3 className="text-lg font-semibold mb-2">{t('noViolationsTitle')}</h3>
                <p className="text-muted-foreground">{t('noViolationsDesc')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {violations.map((violation) => (
                    <div key={violation.ruleId} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              violation.severity === 'critical'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {violation.severity}
                          </Badge>
                          <div>
                            <p className="font-medium">{violation.ruleId}</p>
                            <p className="text-sm text-muted-foreground">{t('instancesCount', { count: violation.count })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('downloadReport')}</CardTitle>
              <CardDescription>{t('downloadReportDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant="outline" onClick={() => handleDownload('pdf')} className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  {t('downloadPdf')}
                </Button>
                <Button variant="outline" onClick={() => handleDownload('json')} className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  {t('downloadJson')}
                </Button>
                <Button variant="outline" onClick={() => handleDownload('csv')} className="justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  {t('downloadCsv')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('shareReport')}</CardTitle>
              <CardDescription>{t('shareReportDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                {t('generateShareLink')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('printReport')}</CardTitle>
              <CardDescription>{t('printReportDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('printReport')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}
