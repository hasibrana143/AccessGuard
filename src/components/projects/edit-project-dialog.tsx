'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string; url: string; description?: string | null } | null;
  onSaved: () => void;
}

export function EditProjectDialog({ open, onOpenChange, project, onSaved }: EditProjectDialogProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setUrl(project.url);
      setDescription(project.description || '');
    }
  }, [project]);

  const handleSave = async () => {
    if (!name || !url) {
      toast({ title: tc('error'), description: t('nameAndUrlRequired'), variant: 'destructive' });
      return;
    }
    try {
      const response = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project?.id, name, url, description }),
      });
      if (response.ok) {
        toast({ title: t('projectUpdated'), description: t('projectUpdatedMsg', { name }) });
        onOpenChange(false);
        onSaved();
      } else {
        toast({ title: tc('error'), description: t('updateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('updateFailed'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('editTitle')}</DialogTitle>
          <DialogDescription>{t('editDesc')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">{t('nameRequired')}</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-url">{t('urlRequired')}</Label>
            <Input id="edit-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('urlPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">{t('description')}</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('descPlaceholder')} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
          <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={handleSave}>{t('saveChanges')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
