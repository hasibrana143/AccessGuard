'use client';

import React, { useState } from 'react';
import { FileText, BarChart3, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useApi';
import { ReportCard } from '@/components/reports/report-card';
import { ShareReportDialog } from '@/components/reports/share-report-dialog';

type ShareType = 'report' | 'vpat' | 'summary';

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const { user } = useAuth();
  const orgSlug = user?.orgSlug ?? undefined;
  const { data: projects } = useProjects(orgSlug);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [generating, setGenerating] = useState<ShareType | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareType, setShareType] = useState<ShareType>('report');

  const typeName = (type: ShareType) => type === 'report' ? t('legalShield') : type === 'vpat' ? t('vpat') : t('execSummary');

  const generateReport = async (type: ShareType) => {
    if (!selectedProjectId) {
      toast({ title: t('title'), description: t('selectProjectFirst'), variant: 'destructive' });
      return;
    }
    setGenerating(type);
    try {
      const endpoint = type === 'report' ? '/api/reports' : type === 'vpat' ? '/api/reports/vpat' : '/api/reports/executive-summary';
      const res = await fetch(`${endpoint}?projectId=${selectedProjectId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('generateFailed'));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'report' ? `accessibility-report-${selectedProjectId}.pdf` : type === 'vpat' ? `vpat-${selectedProjectId}.pdf` : `executive-summary-${selectedProjectId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t('generated'), description: t('generatedMsg', { name: typeName(type) }) });
    } catch (error) {
      toast({ title: tc('error'), description: error instanceof Error ? error.message : t('generateFailed'), variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const openShareDialog = (type: ShareType) => {
    setShareType(type);
    setShareDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="project-select">{t('project')}</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project-select" className="w-72">
                  <SelectValue placeholder={t('selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(projects) && projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <ReportCard type="report" icon={<FileText className="h-6 w-6 text-coral" />} color="coral" generating={generating} onGenerate={generateReport} onShare={openShareDialog} />
        <ReportCard type="vpat" icon={<Shield className="h-6 w-6 text-blue-500" />} color="blue-500" generating={generating} onGenerate={generateReport} onShare={openShareDialog} />
        <ReportCard type="summary" icon={<BarChart3 className="h-6 w-6 text-emerald-500" />} color="emerald-500" generating={generating} onGenerate={generateReport} onShare={openShareDialog} />
      </div>

      <ShareReportDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} shareType={shareType} projects={projects || []} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} />
    </div>
  );
}
