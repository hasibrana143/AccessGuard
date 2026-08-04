'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Loader2, ShieldCheck, Crown, Copy, CheckCircle2, Trash2 } from 'lucide-react';
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
  token?: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export default function TeamPage() {
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
      toast({ title: 'Error', description: 'Failed to load team', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgSlug]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
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
        toast({ title: 'Invite Sent', description: `Invitation sent to ${inviteEmail}` });
        setInviteEmail('');
        fetchData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to send invite', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to send invite', variant: 'destructive' });
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
        toast({ title: 'Role Updated', description: `${member.email} is now ${roleLabels[role]}` });
        fetchData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update role', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
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
        toast({ title: 'Member Removed', description: `${memberToRemove.email} removed from team` });
        setMemberToRemove(null);
        fetchData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to remove member', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
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
        toast({ title: 'Invite Canceled', description: 'Pending invitation revoked' });
        fetchData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to cancel invite', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel invite', variant: 'destructive' });
    }
  };

  const copyInviteLink = async (inviteId: string) => {
    const invite = invites.find((i) => i.id === inviteId);
    if (!invite) return;
    const token = invite.token || inviteId;
    const link = `${window.location.origin}/invite?invite-token=${encodeURIComponent(token)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: 'Link Copied', description: 'Invite link copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy link', variant: 'destructive' });
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
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground">Manage team members and invitations</p>
      </div>

      {!isAdmin && (
        <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          You have view access. Admins can invite members and manage roles.
        </div>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-coral" />
              Invite Member
            </CardTitle>
            <CardDescription>Send an email invitation to join your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — full access</SelectItem>
                    <SelectItem value="member">Member — scan and manage</SelectItem>
                    <SelectItem value="viewer">Viewer — read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="bg-coral hover:bg-coral/90 text-coral-foreground" onClick={handleInvite} disabled={inviting}>
              {inviting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><UserPlus className="h-4 w-4 mr-2" />Send Invite</>}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-coral" />
            Team Members ({members.length})
          </CardTitle>
          <CardDescription>People with access to your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground">No members yet.</p>
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
                    {member.name || 'Unnamed'}
                    {member.id === user?.id && (
                      <Badge variant="outline" className="text-xs">You</Badge>
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
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
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
                    aria-label={`Remove ${member.email}`}
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
              Pending Invitations ({invites.length})
            </CardTitle>
            <CardDescription>Invitations awaiting acceptance</CardDescription>
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
                      {roleLabels[invite.role] || invite.role} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copyInviteLink(invite.id)}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Link
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleCancelInvite(invite.id)}>
                    Cancel
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
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {memberToRemove?.email} from your organization? They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveMember}
              disabled={removing}
            >
              {removing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing...</> : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
