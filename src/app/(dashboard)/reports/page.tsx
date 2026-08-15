'use client';

import React, { useState } from 'react';
import { FileText, BarChart3, Shield, Download, Loader2, Share2, Copy, Check, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useApi';

type ShareType = 'report' | 'vpat' | 'summary';

export default function ReportsPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const { user } = useAuth();
  const orgSlug = user?.orgSlug ?? undefined;
  const { data: projects } = useProjects(orgSlug);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [generating, setGenerating] = useState<'report' | 'vpat' | 'summary' | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareType, setShareType] = useState<ShareType>('report');
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const typeName = (type: ShareType) => type === 'report' ? t('legalShield') : type === 'vpat' ? t('vpat') : t('execSummary');

  const generateReport = async (type: 'report' | 'vpat' | 'summary') => {
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
    setShareUrl(null);
    setCopied(false);
    setShareDialogOpen(true);
  };

  const handleShare = async () => {
    if (!selectedProjectId) {
      toast({ title: t('title'), description: t('selectProjectFirst'), variant: 'destructive' });
      return;
    }
    setSharing(true);
    try {
      const res = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId, reportType: shareType }),
      });
      const data = await res.json();
      if (!data.success) {
        toast({ title: tc('error'), description: data.error || t('shareLinkFailed'), variant: 'destructive' });
        return;
      }
      setShareUrl(window.location.origin + data.data.shareUrl);
      toast({ title: t('shareLinkCreated'), description: t('shareLinkCreatedMsg') });
    } catch {
      toast({ title: tc('error'), description: t('shareLinkFailed'), variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: t('copied'), description: t('copyLink') });
    } catch {
      toast({ title: tc('error'), description: t('copyLinkFailed'), variant: 'destructive' });
    }
  };

  const shareButton = (type: ShareType) => (
    <Button variant="outline" onClick={() => openShareDialog(type)} disabled={generating !== null}>
      <Share2 className="h-4 w-4 mr-2" />
      {t('share')}
    </Button>
  );

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
        <Card className="hover:border-coral/30 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-coral/10">
                <FileText className="h-6 w-6 text-coral" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('legalShield')}</CardTitle>
                <CardDescription>{t('legalShieldDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('legalShieldBody')}
            </p>
            <div className="flex gap-2">
              <Button
                className="w-full bg-coral hover:bg-coral/90 text-coral-foreground"
                onClick={() => generateReport('report')}
                disabled={generating !== null}
              >
                {generating === 'report' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('generating')}</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />{t('generatePdfReport')}</>
                )}
              </Button>
              {shareButton('report')}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-blue-500/30 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('vpat')}</CardTitle>
                <CardDescription>{t('vpatDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('vpatBody')}
            </p>
            <div className="flex gap-2">
              <Button
                className="w-full bg-blue-700 hover:bg-blue-800 text-white"
                onClick={() => generateReport('vpat')}
                disabled={generating !== null}
              >
                {generating === 'vpat' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('generating')}</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />{t('generateVpat')}</>
                )}
              </Button>
              {shareButton('vpat')}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-500/30 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <BarChart3 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('execSummary')}</CardTitle>
                <CardDescription>{t('execSummaryDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('execSummaryBody')}
            </p>
            <div className="flex gap-2">
              <Button
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
                onClick={() => generateReport('summary')}
                disabled={generating !== null}
              >
                {generating === 'summary' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('generating')}</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />{t('generateSummary')}</>
                )}
              </Button>
              {shareButton('summary')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-coral" />
              {t('shareTitle', { name: typeName(shareType) })}
            </DialogTitle>
            <DialogDescription>
              {t('shareDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!shareUrl ? (
              <div className="grid gap-2">
                <Label htmlFor="share-project">{t('project')}</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="share-project" className="w-full">
                    <SelectValue placeholder={t('selectProject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(projects) && projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input value={shareUrl} readOnly className="text-xs font-mono" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={copyShareUrl}>
                    {copied ? <><Check className="h-4 w-4 mr-2 text-emerald-500" />{t('copied')}</> : <><Copy className="h-4 w-4 mr-2" />{t('copyLink')}</>}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('open')}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setShareUrl(null); setCopied(false); }}>
                  {t('createAnotherLink')}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              className="bg-coral hover:bg-coral/90 text-coral-foreground"
              onClick={handleShare}
              disabled={sharing || !!shareUrl}
            >
              {sharing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('creating')}</>
              ) : (
                <><Share2 className="h-4 w-4 mr-2" />{t('createShareLink')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
