'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name: string } | null;
  onDeleted: () => void;
}

export function DeleteProjectDialog({ open, onOpenChange, project, onDeleted }: DeleteProjectDialogProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects?id=${encodeURIComponent(project.id)}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: t('projectDeleted'), description: t('projectDeletedMsg', { name: project.name }) });
        onOpenChange(false);
        onDeleted();
      } else {
        toast({ title: tc('error'), description: t('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('deleteFailed'), variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteDesc', { name: project?.name || '' })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('deleting')}</> : t('projectDeleted')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
