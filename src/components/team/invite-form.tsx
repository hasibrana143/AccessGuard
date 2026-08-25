'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface InviteFormProps {
  onInvited: () => void;
}

export function InviteForm({ onInvited }: InviteFormProps) {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();
  const orgSlug = user?.orgSlug ?? null;
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: tc('error'), description: t('emailRequired'), variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, orgSlug, invitedBy: user?.name || user?.email }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('inviteSent'), description: t('inviteSentMsg', { email: inviteEmail }) });
        setInviteEmail('');
        setInviteRole('member');
        onInvited();
      } else {
        toast({ title: tc('error'), description: data.error || t('inviteSendFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('inviteSendFailed'), variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-coral" />
          {t('inviteMember')}
        </CardTitle>
        <CardDescription>{t('inviteDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="invite-email">{t('email')}</Label>
          <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t('emailPlaceholder')} autoComplete="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="invite-role">{t('role')}</Label>
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger id="invite-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">{t('admin')}</SelectItem>
              <SelectItem value="member">{t('member')}</SelectItem>
              <SelectItem value="viewer">{t('viewer')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={inviting || !inviteEmail.trim()} onClick={handleInvite}>
          {inviting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('sending')}</> : <><UserPlus className="h-4 w-4 mr-2" />{t('sendInvite')}</>}
        </Button>
      </CardContent>
    </Card>
  );
}
