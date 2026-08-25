'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { InviteForm } from '@/components/team/invite-form';
import { MemberList } from '@/components/team/member-list';
import { PendingInvites } from '@/components/team/pending-invites';
import { RemoveMemberDialog } from '@/components/team/remove-member-dialog';
import type { Member, PendingInvite } from '@/components/team/types';

export default function TeamPage() {
  const t = useTranslations('team');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const { toast } = useToast();
  const orgSlug = user?.orgSlug ?? null;
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  const roleLabels: Record<string, string> = { admin: t('admin'), member: t('member'), viewer: t('viewer') };

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

  useEffect(() => { fetchData(); }, [orgSlug]);

  const handleRoleChange = async (member: Member, role: string) => {
    try {
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, role, orgSlug }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('roleUpdated'), description: t('roleUpdatedMsg', { name: member.name || member.email, role }) });
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
      const res = await fetch(`/api/team/members?userId=${encodeURIComponent(memberToRemove.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('memberRemoved'), description: t('memberRemovedMsg', { name: memberToRemove.name || memberToRemove.email }) });
        setMemberToRemove(null);
        fetchData();
      } else {
        toast({ title: tc('error'), description: data.error || t('removeFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('removeFailed'), variant: 'destructive' });
    } finally {
      setRemoving(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/team/invite?id=${encodeURIComponent(inviteId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('inviteCanceled'), description: t('inviteCanceledMsg') });
        fetchData();
      } else {
        toast({ title: tc('error'), description: data.error || t('cancelFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('cancelFailed'), variant: 'destructive' });
    }
  };

  const handleResendInvite = async (invite: PendingInvite) => {
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invite.email, role: invite.role, orgSlug, invitedBy: user?.name || user?.email }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t('inviteResent'), description: t('inviteResentMsg', { email: invite.email }) });
      } else {
        toast({ title: tc('error'), description: data.error || t('resendFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: tc('error'), description: t('resendFailed'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <InviteForm onInvited={fetchData} />
          {members.length === 0 && invites.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('noMembersTitle')}
              description={t('noMembersDesc')}
              actionLabel={t('inviteFirstMember')}
              onAction={() => document.querySelector<HTMLInputElement>('[data-slot="input"]')?.focus()}
            />
          ) : (
            <>
              <MemberList members={members} currentUserId={user?.id} onRoleChange={handleRoleChange} onRemove={setMemberToRemove} roleLabels={roleLabels} />
              <PendingInvites invites={invites} onCancel={handleCancelInvite} onResend={handleResendInvite} />
            </>
          )}
        </>
      )}

      <RemoveMemberDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)} member={memberToRemove} onConfirm={handleRemoveMember} isRemoving={removing} />
    </div>
  );
}
