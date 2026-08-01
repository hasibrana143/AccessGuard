'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Users, ShieldCheck, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { PERMISSION_LABELS, type Permission } from '@/lib/permission-defs';

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

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

export function RolesManager() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Permission[]>([]);

  const loadRoles = () => {
    fetch('/api/roles')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRoles(data.data || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadRoles();
    if (user?.orgSlug) {
      fetch(`/api/team/members?orgSlug=${encodeURIComponent(user.orgSlug)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setMembers(data.data || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.orgSlug]);

  const togglePermission = (permission: Permission) => {
    setSelected((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) {
      toast({ title: 'Incomplete', description: 'Enter a name and select at least one permission', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), permissions: selected }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Role Created', description: `Role "${name.trim()}" is ready to assign` });
        setName('');
        setDescription('');
        setSelected([]);
        loadRoles();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create role', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create role', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (role: CustomRole) => {
    const confirmed = window.confirm(`Delete role "${role.name}"? Members with this role keep base member permissions.`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/roles?id=${encodeURIComponent(role.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        toast({ title: 'Role Deleted', description: `${role.name} removed` });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete role', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete role', variant: 'destructive' });
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
        const roleName = roles.find((r) => r.id === customRoleId)?.name ?? 'no custom role';
        toast({ title: 'Assignment Updated', description: `${member.email} now has ${roleName}` });
        setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, customRoleId: customRoleId || null } : m)));
        loadRoles();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update assignment', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update assignment', variant: 'destructive' });
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-coral" />
          Custom Roles
        </CardTitle>
        <CardDescription>
          Create roles with specific permissions and assign them to members. Owners and admins always keep their full access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No custom roles yet. Create your first role below.</p>
            ) : (
              roles.map((role) => (
                <div key={role.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{role.name}</p>
                      {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {role.members.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {role.members.length} member{role.members.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" aria-label={`Delete role ${role.name}`} onClick={() => handleDelete(role)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs font-normal">
                        {PERMISSION_LABELS[p].label}
                      </Badge>
                    ))}
                  </div>
                  {role.members.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {role.members.map((m) => (
                        <span key={m.id} className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          {m.name || m.email}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="p-4 border border-border rounded-lg space-y-4">
          <div>
            <p className="font-medium text-sm mb-1">Assign to members</p>
            <p className="text-xs text-muted-foreground">Members keep base member permissions; the custom role adds extra ones</p>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found in this organization.</p>
          ) : (
            <div className="space-y-2">
              {members
                .filter((m) => m.role === 'member')
                .map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserCog className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{member.name || member.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <Select
                      value={member.customRoleId ?? ''}
                      disabled={assigningId === member.id}
                      onValueChange={(value) => handleAssign(member, value)}
                    >
                      <SelectTrigger className="w-[190px]" aria-label={`Custom role for ${member.name || member.email}`}>
                        <SelectValue placeholder="No custom role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No custom role</SelectItem>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              {members.filter((m) => m.role === 'member').length === 0 && (
                <p className="text-sm text-muted-foreground">No regular members to assign roles to.</p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border border-border rounded-lg space-y-4">
          <div>
            <p className="font-medium text-sm mb-1">Create a role</p>
            <p className="text-xs text-muted-foreground">Pick a name and the permissions to grant</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-name">Role name</Label>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Auditor" maxLength={50} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-description">Description (optional)</Label>
            <Input id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this role for?" maxLength={200} />
          </div>
          <div className="grid gap-2">
            <Label>Permissions</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((permission) => (
                <label
                  key={permission}
                  className={`flex items-start gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${
                    selected.includes(permission) ? 'border-coral/50 bg-coral/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="mt-0.5 h-4 w-4 accent-coral"
                    aria-label={PERMISSION_LABELS[permission].label}
                  />
                  <div>
                    <p className="text-sm font-medium leading-tight">{PERMISSION_LABELS[permission].label}</p>
                    <p className="text-xs text-muted-foreground">{PERMISSION_LABELS[permission].description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" disabled={creating} onClick={handleCreate}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Role
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
