'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCreateProject } from '@/hooks/useApi';
import type { CreateProjectInput } from '@/types';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const { user } = useAuth();
  const orgSlug = user?.orgSlug ?? undefined;
  const createProject = useCreateProject();
  const [newProject, setNewProject] = useState<CreateProjectInput>({ name: '', url: '', description: '' });
  const [scanFrequency, setScanFrequency] = useState('none');

  const handleCreate = async () => {
    if (!newProject.name || !newProject.url) {
      toast({ title: tc('error'), description: t('nameAndUrlRequired'), variant: 'destructive' });
      return;
    }
    if (!orgSlug) {
      toast({ title: tc('error'), description: t('orgNotFound'), variant: 'destructive' });
      return;
    }
    try {
      const result = await createProject.mutateAsync({ ...newProject, orgSlug });
      toast({ title: t('projectCreated'), description: t('projectCreatedMsg', { name: newProject.name }) });
      if (scanFrequency && scanFrequency !== 'none' && result?.project?.id) {
        try {
          await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: result.project.id, schedule: scanFrequency }),
          });
          toast({ title: t('scanScheduled'), description: t('scanScheduledMsg', { frequency: scanFrequency }) });
        } catch {
          toast({ title: tc('error'), description: t('scheduleFailed'), variant: 'destructive' });
        }
      }
      onOpenChange(false);
      setNewProject({ name: '', url: '', description: '' });
      setScanFrequency('none');
    } catch {
      toast({ title: tc('error'), description: t('createFailed'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('addProjectTitle')}</DialogTitle>
          <DialogDescription>{t('addProjectDesc')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('nameRequired')}</Label>
            <Input id="name" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} placeholder={t('namePlaceholder')} autoComplete="organization" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">{t('urlRequired')}</Label>
            <Input id="url" type="url" value={newProject.url} onChange={(e) => setNewProject({ ...newProject, url: e.target.value })} placeholder={t('urlPlaceholder')} autoComplete="url" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea id="description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} placeholder={t('descPlaceholder')} rows={3} autoComplete="off" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scan-frequency">{t('scanFrequency')}</Label>
            <Select value={scanFrequency} onValueChange={setScanFrequency}>
              <SelectTrigger id="scan-frequency"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('noneFrequency')}</SelectItem>
                <SelectItem value="daily">{t('daily')}</SelectItem>
                <SelectItem value="weekly">{t('weekly')}</SelectItem>
                <SelectItem value="monthly">{t('monthly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={handleCreate} disabled={createProject.isPending}>
            {createProject.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('creating')}</> : t('addProject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
