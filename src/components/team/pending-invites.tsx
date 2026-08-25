'use client';

import { useTranslations } from 'next-intl';
import { Mail, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PendingInvite } from './types';

interface PendingInvitesProps {
  invites: PendingInvite[];
  onCancel: (inviteId: string) => void;
  onResend: (invite: PendingInvite) => void;
}

export function PendingInvites({ invites, onCancel, onResend }: PendingInvitesProps) {
  const t = useTranslations('team');

  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-coral" />
          {t('pendingInvites')}
        </CardTitle>
        <CardDescription>{t('invitesDesc', { count: invites.length })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
            <div className="p-2 rounded-lg bg-coral/10">
              <Mail className="h-4 w-4 text-coral" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate block">{invite.email}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">{invite.role}</Badge>
                <span>•</span>
                <span>{t('expires')} {new Date(invite.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onResend(invite)}>{t('resend')}</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={t('cancelInviteAria', { email: invite.email })} onClick={() => onCancel(invite.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
