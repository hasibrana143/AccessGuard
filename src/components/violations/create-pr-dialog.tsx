'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Github, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface CreatePrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violationIds: string[];
  totalCount: number;
}

export function CreatePrDialog({ open, onOpenChange, violationIds, totalCount }: CreatePrDialogProps) {
  const t = useTranslations('violations');
  const tc = useTranslations('common');
  const { toast } = useToast();

  const [repos, setRepos] = useState<{ fullName: string; name: string; description?: string | null; private?: boolean }[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [prResult, setPrResult] = useState<{ prUrl?: string; message?: string; demoMode?: boolean; violationsCount?: number; project?: { name: string } } | null>(null);

  useEffect(() => {
    if (open) {
      setPrResult(null);
      setSelectedRepo('');
      setReposLoading(true);
      fetch('/api/github/repos')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setRepos(data.data || []);
            setDemoMode(!!data.demoMode);
            if (data.data?.length > 0 && data.demoMode) setSelectedRepo(data.data[0].fullName);
          }
        })
        .catch(() => {})
        .finally(() => setReposLoading(false));
    }
  }, [open]);

  const handleCreate = async () => {
    if (prSubmitting) return;
    if (violationIds.length === 0) {
      toast({ title: t('noFixesAvailable'), description: t('noFixesAvailableDesc'), variant: 'destructive' });
      return;
    }
    setPrSubmitting(true);
    setPrResult(null);
    try {
      const res = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violationIds, repository: selectedRepo || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        toast({ title: tc('error'), description: data.error || t('prCreateFailed'), variant: 'destructive' });
      } else {
        const info = data.data || {};
        setPrResult({ prUrl: info.prUrl, message: info.message || t('prCreated'), demoMode: data.demoMode || false, violationsCount: info.violationsCount || violationIds.length, project: info.project });
        toast({ title: data.demoMode ? t('previewGenerated') : t('prCreated'), description: data.demoMode ? t('githubNotConnected') : t('prCreated') });
      }
    } catch {
      toast({ title: tc('error'), description: t('prCreateFailed'), variant: 'destructive' });
    } finally {
      setPrSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5 text-coral" />{t('createFixPrs')}
          </DialogTitle>
          <DialogDescription>
            {t('createPrDesc')}{' '}
            <strong>{violationIds.length > 0 ? t('prSelectedCount', { count: violationIds.length }) : t('prFixCount', { count: totalCount })}</strong>.
            {violationIds.length === 0 && totalCount === 0 && (
              <span className="block mt-1 text-red-500">{t('prNoFixes')}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {reposLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {demoMode && (
                <div className="p-3 rounded-lg border border-coral/20 bg-coral/5 text-sm text-muted-foreground">{t('githubNotConnected')}</div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="pr-repo">{t('repository')}</Label>
                {repos.length > 0 ? (
                  <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                    <SelectTrigger id="pr-repo"><SelectValue placeholder={t('selectRepository')} /></SelectTrigger>
                    <SelectContent>
                      {repos.map((repo) => (
                        <SelectItem key={repo.fullName} value={repo.fullName}>{repo.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noRepositories')}</p>
                )}
              </div>

              {prResult && (
                <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${prResult.demoMode ? 'text-coral' : 'text-emerald-500'}`} />
                    <span className="text-sm font-medium">{prResult.demoMode ? t('previewGenerated') : t('prCreated')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{prResult.message}</p>
                  {prResult.violationsCount != null && (
                    <p className="text-xs text-muted-foreground">
                      {t('fixFiles', { count: prResult.violationsCount })}{prResult.project ? ` ${t('forProject', { name: prResult.project.name })}` : ''}
                    </p>
                  )}
                  {prResult.prUrl && (
                    <Button variant="outline" size="sm" className="w-full text-coral border-coral/30 hover:bg-coral/10" onClick={() => window.open(prResult.prUrl, '_blank', 'noopener,noreferrer')}>
                      <ExternalLink className="h-4 w-4 mr-2" />{t('viewPrOnGithub')}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={prSubmitting}>{tc('close')}</Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={handleCreate} disabled={prSubmitting || (repos.length > 0 && !selectedRepo)}>
            {prSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('creatingPr')}</> : <><Github className="h-4 w-4 mr-2" />{t('createPr')}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
