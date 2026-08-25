'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ImportProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportProjectsDialog({ open, onOpenChange, onImported }: ImportProjectsDialogProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const { user } = useAuth();
  const orgSlug = user?.orgSlug ?? undefined;
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number; skipped: number; failedDetails: Array<{ url?: string; name?: string; error: string }> } | null>(null);

  const handleImport = async () => {
    if (!orgSlug) {
      toast({ title: tc('error'), description: t('orgNotFound'), variant: 'destructive' });
      return;
    }
    const rows: Array<{ name: string; url: string; description: string; scanFrequency: string }> = [];
    for (const line of csvText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cols = trimmed.split(',').map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      if (cols.length < 2) continue;
      rows.push({ name: cols[0], url: cols[1], description: cols[2] || '', scanFrequency: cols[3] || 'none' });
    }
    if (rows.length === 0) {
      toast({ title: tc('error'), description: t('noValidRows'), variant: 'destructive' });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: rows, orgSlug }),
      });
      const data = await res.json();
      if (!data.success) {
        toast({ title: t('importFailed'), description: data.error || t('importFailed'), variant: 'destructive' });
      } else {
        setImportResult({ created: data.data.totalCreated, failed: data.data.totalFailed, skipped: data.data.totalSkipped, failedDetails: [...data.data.failed, ...data.data.skipped] });
        toast({ title: t('importComplete'), description: t('importCompleteMsg', { created: data.data.totalCreated, failed: data.data.totalFailed, skipped: data.data.totalSkipped }) });
        onImported();
      }
    } catch {
      toast({ title: t('importFailed'), description: t('importFailed'), variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('bulkImportTitle')}</DialogTitle>
          <DialogDescription>{t('bulkImportDesc', { format: 'name,url,description,scanFrequency' })}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="import-csv">{t('csvFile')}</Label>
            <Input id="import-csv" type="file" accept=".csv,.txt" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setCsvText(String(reader.result || ''));
              reader.readAsText(file);
            }} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="import-paste">{t('pasteRows')}</Label>
            <Textarea id="import-paste" value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={t('csvPlaceholder')} rows={6} autoComplete="off" />
          </div>
          {importResult && (
            <div className={`p-3 rounded-lg border text-sm ${importResult.failed > 0 ? 'border-orange-500/30 bg-orange-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
              <div className="font-medium mb-1">{t('importResult', { created: importResult.created, failed: importResult.failed, skipped: importResult.skipped })}</div>
              {importResult.failedDetails.slice(0, 5).map((f, i) => (
                <p key={i} className="text-xs text-muted-foreground">- {f.url || f.name || '?'}: {f.error}</p>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>{tc('close')}</Button>
          <Button onClick={handleImport} disabled={importing || !csvText.trim()}>
            {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('importing')}</> : <><Upload className="h-4 w-4 mr-2" />{t('importProjects')}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
