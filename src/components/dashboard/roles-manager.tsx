'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RoleList } from './role-list';
import { RoleAssignment } from './role-assignment';
import { CreateRoleForm } from './create-role-form';
import type { Permission } from '@/lib/permission-defs';

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  members: Array<{ id: string; name: string | null; email: string }>;
}

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  customRoleId: string | null;
}

export function RolesManager() {
  const t = useTranslations('dash');
  const { toast } = useToast();
  const { user } = useAuth();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const loadRoles = () => {
    fetch('/api/roles')
      .then((res) => res.json())
      .then((data) => { if (data.success) setRoles(data.data || []); })
      .catch(() => {});
  };

  useEffect(() => {
    loadRoles();
    if (user?.orgSlug) {
      fetch(`/api/team/members?orgSlug=${encodeURIComponent(user.orgSlug)}`)
        .then((res) => res.json())
        .then((data) => { if (data.success) setMembers(data.data || []); })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.orgSlug]);

  const handleDelete = async (role: CustomRole) => {
    const confirmed = window.confirm(t('deleteConfirm', { name: role.name }));
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/roles?id=${encodeURIComponent(role.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        toast({ title: t('roleDeleted'), description: t('roleDeletedMsg', { name: role.name }) });
      } else {
        toast({ title: t('error'), description: data.error || t('deleteFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('error'), description: t('deleteFailed'), variant: 'destructive' });
    }
  };

  const handleAssign = async (member: Member, customRoleId: string) => {
    if (assigningId) return;
    setAssigningId(member.id);
    try {
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, customRoleId: customRoleId || null }),
      });
      const data = await res.json();
      if (data.success) {
        const roleName = roles.find((r) => r.id === customRoleId)?.name ?? t('noCustomRole');
        toast({ title: t('assignmentUpdated'), description: t('assignmentMsg', { email: member.email, role: roleName }) });
        setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, customRoleId: customRoleId || null } : m)));
        loadRoles();
      } else {
        toast({ title: t('error'), description: data.error || t('updateFailed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: t('error'), description: t('updateFailed'), variant: 'destructive' });
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-coral" />
          {t('customRoles')}
        </CardTitle>
        <CardDescription>{t('customRolesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <RoleList roles={roles} onDelete={handleDelete} />
        )}
        <RoleAssignment members={members} roles={roles} assigningId={assigningId} onAssign={handleAssign} />
        <CreateRoleForm onCreated={loadRoles} />
      </CardContent>
    </Card>
  );
}
