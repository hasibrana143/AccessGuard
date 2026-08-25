'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Member } from './types';

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onConfirm: () => void;
  isRemoving: boolean;
}

export function RemoveMemberDialog({ open, onOpenChange, member, onConfirm, isRemoving }: RemoveMemberDialogProps) {
  const t = useTranslations('team');
  const tc = useTranslations('common');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('removeMemberTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('removeMemberDesc', { name: member?.name || member?.email || '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm} disabled={isRemoving}>
            {isRemoving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('removing')}</> : tc('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
