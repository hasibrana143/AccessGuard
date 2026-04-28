// React Query hooks for team management
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const teamKeys = {
  members: ['team', 'members'] as const,
  invites: ['team', 'invites'] as const,
};

// Get team members
export function useTeamMembers(enabled = true) {
  return useQuery({
    queryKey: teamKeys.members,
    queryFn: async () => {
      const res = await fetch('/api/team/members');
      const data = await res.json();
      return data.data || [];
    },
    enabled,
  });
}

// Get pending invites
export function usePendingInvites(enabled = true) {
  return useQuery({
    queryKey: teamKeys.invites,
    queryFn: async () => {
      const res = await fetch('/api/team/invite');
      const data = await res.json();
      return data.data || [];
    },
    enabled,
  });
}

// Invite member
export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invites });
    },
  });
}

// Cancel invite
export function useCancelInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/invite?id=${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.invites });
    },
  });
}

// Update member role
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members });
    },
  });
}

// Remove member
export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/team/members?userId=${userId}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.members });
    },
  });
}
