'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  ExternalLink,
  Copy,
  Code,
  Shield,
  BookOpen,
  Wand2,
  Ban,
  AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import type { Violation, RemediationResponse } from '@/types';

export default function ViolationDetailPage() {
  const t = useTranslations('vdetail');
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const violationId = params.id as string;
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: violation, isLoading: violationLoading } = useQuery({
    queryKey: ['violation', violationId],
    queryFn: async (): Promise<Violation | null> => {
      const result = await api.getViolations({ limit: 200 });
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: Violation[] };
      const violations = responseData?.data || [];
      return violations.find((v) => v.id === violationId) || null;
    },
    retry: false,
  });

  const { data: remediation, isLoading: remediationLoading } = useQuery({
    queryKey: ['remediation', violationId],
    queryFn: async (): Promise<RemediationResponse | null> => {
      const result = await api.getRemediation(violationId);
      if (!result.success) return null;
      const responseData = result.data as { data?: RemediationResponse };
      return responseData?.data || null;
    },
    enabled: !!violationId,
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: 'fixed' | 'ignored' | 'false_positive') => {
      const result = await api.updateViolationStatus(violationId, status);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['violation', violationId] });
    },
  });

  if (violationLoading) {
    return <ViolationDetailSkeleton />;
  }

  if (!violation) {
    return <DashboardNotFound title={t('notFoundTitle')} description={t('notFoundDesc')} />;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const severityConfig = {
    critical: { color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-100' },
    serious: { color: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-100' },
    moderate: { color: 'bg-yellow-500', textColor: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    minor: { color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-100' },
  };

  const sevConfig = severityConfig[violation.severity];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/violations')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToViolations')}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
            <Badge variant={violation.status === 'open' ? 'destructive' : 'secondary'}>
              {violation.status}
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground truncate max-w-full">
            {violation.ruleId} • {violation.url}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateStatusMutation.mutate('fixed')}
            disabled={updateStatusMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('markFixed')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateStatusMutation.mutate('ignored')}
            disabled={updateStatusMutation.isPending}
          >
            <Ban className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('ignore')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateStatusMutation.mutate('false_positive')}
            disabled={updateStatusMutation.isPending}
          >
            <AlertCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('falsePositive')}</span>
          </Button>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('severity')}</p>
                <p className={`text-2xl font-bold capitalize ${sevConfig.textColor}`}>
                  {violation.severity}
                </p>
              </div>
              <div className={`h-8 w-8 rounded-full ${sevConfig.bgColor} flex items-center justify-center`}>
                <AlertTriangle className={`h-4 w-4 ${sevConfig.textColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('wcag')}</p>
                <p className="text-2xl font-bold">{violation.wcagCriteria || '—'}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('aiConfidence')}</p>
                <p className="text-2xl font-bold">
                  {violation.aiConfidenceScore
                    ? `${Math.round(violation.aiConfidenceScore * 100)}%`
                    : '—'}
                </p>
              </div>
              <Wand2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('found')}</p>
                <p className="text-2xl font-bold">
                  {t('foundAgo', { time: formatDistanceToNow(new Date(violation.createdAt)) })}
                </p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">{t('tabDetails')}</TabsTrigger>
          <TabsTrigger value="remediation">{t('tabRemediation')}</TabsTrigger>
          <TabsTrigger value="element">{t('tabElement')}</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{violation.description}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('location')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">{t('url')}</p>
                  <a
                    href={violation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center gap-1"
                  >
                    {violation.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {violation.elementSelector && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('selector')}</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
                      {violation.elementSelector}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('metadata')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('ruleId')}</span>
                  <span className="font-mono text-sm">{violation.ruleId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('status')}</span>
                  <Badge variant={violation.status === 'open' ? 'destructive' : 'secondary'}>
                    {violation.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('created')}</span>
                  <span className="text-sm">{new Date(violation.createdAt).toLocaleString()}</span>
                </div>
                {violation.fixedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('fixed')}</span>
                    <span className="text-sm">{new Date(violation.fixedAt).toLocaleString()}</span>
                  </div>
                )}
                {violation.githubPrUrl && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('pr')}</span>
                    <a
                      href={violation.githubPrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {t('viewPr')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {violation.aiExplanation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('aiExplanation')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{violation.aiExplanation}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Remediation Tab */}
        <TabsContent value="remediation" className="space-y-4">
          {remediationLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : remediation ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('suggestedFix')}</CardTitle>
                  <CardDescription>
                    {t('aiGeneratedWith', { confidence: Math.round(remediation.confidence * 100) })}
                    {remediation.cached && ` ${t('cached')}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono">
                      {remediation.remediationCode}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(remediation.remediationCode)}
                    >
                      {copiedCode ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('explanation')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{remediation.explanation}</p>
                </CardContent>
              </Card>
            </>
          ) : violation.remediationCode ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('remediationCode')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono">
                    {violation.remediationCode}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(violation.remediationCode || '')}
                  >
                    {copiedCode ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t('noRemediation')}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Element Tab */}
        <TabsContent value="element" className="space-y-4">
          {violation.elementHtml ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('elementHtml')}</CardTitle>
                <CardDescription>{t('elementHtmlDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto font-mono">
                  {violation.elementHtml}
                </pre>
                {violation.elementSelector && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">{t('cssSelector')}</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded block overflow-x-auto">
                      {violation.elementSelector}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t('noElementHtml')}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ViolationDetailSkeleton() {
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
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
