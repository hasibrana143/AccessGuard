// React Query hooks for scheduled scans
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const scheduleKeys = {
  all: ['schedule'] as const,
};

export interface ScheduledScan {
  id: string;
  projectId: string;
  cron: string;
  nextRunAt: string;
  lastRunAt: string | null;
  enabled: boolean;
  createdAt: string;
  project?: { name: string; url: string };
}

// Get all scheduled scans
export function useScheduledScans(enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.all,
    queryFn: async (): Promise<ScheduledScan[]> => {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      return data.data || [];
    },
    enabled,
  });
}

// Create schedule
export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, cron, enabled }: { projectId: string; cron: string; enabled?: boolean }) => {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, cron, enabled }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

// Update schedule
export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cron, enabled }: { id: string; cron?: string; enabled?: boolean }) => {
      const res = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, cron, enabled }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}

// Delete schedule
export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
    },
  });
}
