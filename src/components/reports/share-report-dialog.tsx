'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Copy, Check, Link as LinkIcon, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/types';

type ShareType = 'report' | 'vpat' | 'summary';

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareType: ShareType;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
}

export function ShareReportDialog({ open, onOpenChange, shareType, projects, selectedProjectId, onSelectProject }: ShareReportDialogProps) {
  const t = useTranslations('reports');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const typeName = shareType === 'report' ? t('legalShield') : shareType === 'vpat' ? t('vpat') : t('execSummary');

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

  const handleClose = () => {
    setShareUrl(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-coral" />
            {t('shareTitle', { name: typeName })}
          </DialogTitle>
          <DialogDescription>{t('shareDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!shareUrl ? (
            <div className="grid gap-2">
              <Label htmlFor="share-project">{t('project')}</Label>
              <Select value={selectedProjectId} onValueChange={onSelectProject}>
                <SelectTrigger id="share-project" className="w-full">
                  <SelectValue placeholder={t('selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
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
                  <ExternalLink className="h-4 w-4 mr-2" />{t('open')}
                </Button>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setShareUrl(null); setCopied(false); }}>
                {t('createAnotherLink')}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={handleShare} disabled={sharing || !!shareUrl}>
            {sharing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('creating')}</> : <><Share2 className="h-4 w-4 mr-2" />{t('createShareLink')}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
