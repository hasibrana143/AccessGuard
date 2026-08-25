'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface HtmlUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string } | null;
}

export function HtmlUploadDialog({ open, onOpenChange, project }: HtmlUploadDialogProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const [manualHtml, setManualHtml] = useState('');

  const handleScan = async () => {
    if (!project || !manualHtml.trim()) {
      toast({ title: tc('error'), description: t('pasteHtml'), variant: 'destructive' });
      return;
    }
    try {
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, html: manualHtml }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: t('manualScanCompleted'), description: t('manualScanCompletedMsg', { count: result.data?.scan?.violationsFound || 0 }) });
        onOpenChange(false);
        setManualHtml('');
      } else {
        toast({ title: t('scanFailed'), description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('failedSubmitManual'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('manualScanTitle')}</DialogTitle>
          <DialogDescription>{t('manualScanDesc', { name: project?.name || '' })}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>{t('htmlSource')}</Label>
            <Textarea placeholder="<!DOCTYPE html>&#10;<html>&#10;  <head>...</head>&#10;  <body>...</body>&#10;</html>" value={manualHtml} onChange={(e) => setManualHtml(e.target.value)} className="min-h-64 font-mono text-sm" />
            <p className="text-xs text-muted-foreground">{t('htmlTip')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={handleScan} disabled={!manualHtml.trim()}>{t('scanHtml')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
