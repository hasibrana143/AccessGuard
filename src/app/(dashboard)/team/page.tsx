'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Users, UserPlus, Mail, Loader2, ShieldCheck, Crown, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export default function TeamPage() {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const orgSlug = user?.orgSlug ?? null;
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);
  const roleLabels: Record<string, string> = {
    admin: t('admin'),
    member: t('member'),
    viewer: t('viewer'),
  };

  const fetchData = async () => {
    if (!orgSlug) return;
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/team/members?orgSlug=${encodeURIComponent(orgSlug)}`),
        fetch(`/api/team/invite?orgSlug=${encodeURIComponent(orgSlug)}`),
      ]);
      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();
      if (membersData.success) setMembers(membersData.data || []);
      if (invitesData.success) setInvites(invitesData.data || []);
    } catch {
      toast({ title: tc('error'), description: t('loadFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgSlug]);

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
        fetchData();
      } else {
        toast({ title: tc('error'), description: data.error || t('inviteSendFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('inviteSendFailed'), variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: Member, role: string) => {
    try {
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, role }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('roleUpdated'), description: t('roleUpdatedMsg', { email: member.email, role: roleLabels[role] }) });
        fetchData();
      } else {
        toast({ title: tc('error'), description: data.error || t('roleUpdateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('roleUpdateFailed'), variant: 'destructive' });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/team/members?userId=${encodeURIComponent(memberToRemove.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('memberRemoved'), description: t('memberRemovedMsg', { email: memberToRemove.email }) });
        setMemberToRemove(null);
        fetchData();
      } else {
        toast({ title: tc('error'), description: data.error || t('memberRemoveFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('memberRemoveFailed'), variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/team/invite?id=${encodeURIComponent(inviteId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('inviteCanceled'), description: t('inviteCanceledMsg') });
        fetchData();
      } else {
        toast({ title: tc('error'), description: data.error || t('inviteCancelFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('inviteCancelFailed'), variant: 'destructive' });
    }
  };

  const resendInvite = async (invite: { id: string; email: string; role: string }) => {
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invite.email, role: invite.role }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: t('inviteResent'), description: t('inviteResentMsg', { email: invite.email }) });
      } else {
        toast({ title: tc('error'), description: data.error || t('resendFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('resendFailed'), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {!isAdmin && (
        <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          {t('viewAccessNote')}
        </div>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-coral" />
              {t('inviteTitle')}
            </CardTitle>
            <CardDescription>{t('inviteDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">{t('role')}</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t('roleAdmin')}</SelectItem>
                    <SelectItem value="member">{t('roleMember')}</SelectItem>
                    <SelectItem value="viewer">{t('roleViewer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={handleInvite} disabled={inviting}>
              {inviting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('sending')}</> : <><UserPlus className="h-4 w-4 mr-2" />{t('sendInvite')}</>}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-coral" />
            {t('teamMembers', { count: members.length })}
          </CardTitle>
          <CardDescription>{t('membersDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('noMembers')}</p>
          )}
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.avatar || undefined} />
                  <AvatarFallback className="bg-coral/10 text-coral">
                    {(member.name || member.email).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {member.name || t('unnamed')}
                    {member.id === user?.id && (
                      <Badge variant="outline" className="text-xs">{t('you')}</Badge>
                    )}
                    {member.role === 'admin' && (
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && member.id !== user?.id ? (
                  <Select value={member.role} onValueChange={(role) => handleRoleChange(member, role)}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('admin')}</SelectItem>
                      <SelectItem value="member">{t('member')}</SelectItem>
                      <SelectItem value="viewer">{t('viewer')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="capitalize">
                    {roleLabels[member.role] || member.role}
                  </Badge>
                )}
                {isAdmin && member.id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setMemberToRemove(member)}
                    aria-label={t('removeAria', { email: member.email })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isAdmin && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-coral" />
              {t('pendingInvitesCount', { count: invites.length })}
            </CardTitle>
            <CardDescription>{t('pendingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {roleLabels[invite.role] || invite.role} • {t('expires', { date: new Date(invite.expiresAt).toLocaleDateString() })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => resendInvite(invite)}>
                    <Mail className="h-4 w-4 mr-1" />
                    {t('resend')}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleCancelInvite(invite.id)}>
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeDialogMsg', { email: memberToRemove?.email ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveMember}
              disabled={removing}
            >
              {removing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('removing')}</> : t('removeMember')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
