'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Github, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function GitHubSettings() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const [githubLoading, setGithubLoading] = useState(false);

  const handleManage = async () => {
    setGithubLoading(true);
    try {
      const res = await fetch('/api/github/repos');
      const data = await res.json();
      if (data.success) {
        const repos = data.data || [];
        if (repos.length > 0) {
          toast({ title: t('connected'), description: t('reposLinked', { count: repos.length }) });
        } else {
          toast({ title: t('noRepos'), description: t('connectGithub') });
          window.location.href = '/api/github/connect';
        }
      } else {
        toast({ title: tc('error'), description: t('reposFetchFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('githubNotConnected'), variant: 'destructive' });
    } finally {
      setGithubLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('githubIntegration')}</CardTitle>
          <CardDescription>{t('githubIntegrationDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <Github className="h-8 w-8" />
              <div>
                <p className="font-medium">{t('connectedToGithub')}</p>
                <p className="text-sm text-muted-foreground">{t('reposLinked', { count: 3 })}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={githubLoading} onClick={handleManage}>
              {githubLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('loading')}</> : t('manage')}
            </Button>
          </div>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={githubLoading} onClick={() => { window.location.href = '/api/github/connect'; }}>
            {githubLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('connecting')}</> : <><Plus className="h-4 w-4 mr-1" />{t('addRepository')}</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
