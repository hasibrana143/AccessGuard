'use client';

import React, { useState } from 'react';
import { FileText, BarChart3, Shield, Download, Loader2, Share2, Copy, Check, Link as LinkIcon, ExternalLink } from 'lucide-react';
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

  const generateReport = async (type: 'report' | 'vpat' | 'summary') => {
    if (!selectedProjectId) {
      toast({ title: 'Select Project', description: 'Please select a project first', variant: 'destructive' });
      return;
    }
    setGenerating(type);
    try {
      const endpoint = type === 'report' ? '/api/reports' : type === 'vpat' ? '/api/reports/vpat' : '/api/reports/executive-summary';
      const res = await fetch(`${endpoint}?projectId=${selectedProjectId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'report' ? `accessibility-report-${selectedProjectId}.pdf` : type === 'vpat' ? `vpat-${selectedProjectId}.pdf` : `executive-summary-${selectedProjectId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Generated', description: `${type === 'report' ? 'Report' : type === 'vpat' ? 'VPAT' : 'Executive Summary'} downloaded successfully` });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to generate', variant: 'destructive' });
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
      toast({ title: 'Select Project', description: 'Please select a project first', variant: 'destructive' });
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
        toast({ title: 'Error', description: data.error || 'Failed to create share link', variant: 'destructive' });
        return;
      }
      setShareUrl(window.location.origin + data.data.shareUrl);
      toast({ title: 'Share Link Created', description: 'Anyone with the link can view this report snapshot' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create share link', variant: 'destructive' });
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
      toast({ title: 'Copied', description: 'Share link copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy link', variant: 'destructive' });
    }
  };

  const shareButton = (type: ShareType) => (
    <Button variant="outline" onClick={() => openShareDialog(type)} disabled={generating !== null}>
      <Share2 className="h-4 w-4 mr-2" />
      Share
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Generate compliance reports and VPAT documentation</p>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="project-select">Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project-select" className="w-72">
                  <SelectValue placeholder="Select a project..." />
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
                <CardTitle className="text-lg">Legal Shield™ Report</CardTitle>
                <CardDescription>Timestamped audit for legal defense</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a comprehensive PDF report documenting your accessibility compliance efforts.
              Includes timestamps, violation history, and remediation records.
            </p>
            <div className="flex gap-2">
              <Button
                className="w-full bg-coral hover:bg-coral/90 text-coral-foreground"
                onClick={() => generateReport('report')}
                disabled={generating !== null}
              >
                {generating === 'report' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Generate PDF Report</>
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
                <CardTitle className="text-lg">VPAT Report</CardTitle>
                <CardDescription>WCAG 2.1 AA conformance documentation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a Voluntary Product Accessibility Template (VPAT) that evaluates your
              product against all WCAG 2.1 AA success criteria with conformance levels.
            </p>
            <div className="flex gap-2">
              <Button
                className="w-full bg-blue-700 hover:bg-blue-800 text-white"
                onClick={() => generateReport('vpat')}
                disabled={generating !== null}
              >
                {generating === 'vpat' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Generate VPAT</>
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
                <CardTitle className="text-lg">Executive Summary</CardTitle>
                <CardDescription>High-level compliance overview</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              A summary report perfect for stakeholders. Includes risk scores, trend analysis,
              and actionable recommendations.
            </p>
            <div className="flex gap-2">
              <Button
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
                onClick={() => generateReport('summary')}
                disabled={generating !== null}
              >
                {generating === 'summary' ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />Generate Summary</>
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
              Share {shareType === 'report' ? 'Report' : shareType === 'vpat' ? 'VPAT' : 'Executive Summary'}
            </DialogTitle>
            <DialogDescription>
              Create a public snapshot link for stakeholders. Anyone with the link can view the report without an account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!shareUrl ? (
              <div className="grid gap-2">
                <Label htmlFor="share-project">Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="share-project" className="w-full">
                    <SelectValue placeholder="Select a project..." />
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
                    {copied ? <><Check className="h-4 w-4 mr-2 text-emerald-500" />Copied</> : <><Copy className="h-4 w-4 mr-2" />Copy Link</>}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setShareUrl(null); setCopied(false); }}>
                  Create another link
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
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
              ) : (
                <><Share2 className="h-4 w-4 mr-2" />Create Share Link</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
