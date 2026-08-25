'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from './query-keys';
import type { Severity, ViolationStatus, Violation, ViolationStats } from '@/types';

export function useViolations(params: {
  projectId?: string;
  severity?: Severity | 'all';
  status?: ViolationStatus | 'all';
  ruleId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  return useQuery({
    queryKey: queryKeys.violations(params),
    queryFn: async (): Promise<Violation[]> => {
      const result = await api.getViolations(params);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: Violation[] };
      return responseData?.data || [];
    },
    retry: false,
    placeholderData: [],
  });
}

export function useViolationStats(projectId?: string, orgSlug?: string) {
  return useQuery({
    queryKey: queryKeys.stats(projectId, orgSlug),
    queryFn: async (): Promise<ViolationStats | null> => {
      const result = await api.getViolationStats(projectId, orgSlug);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: ViolationStats };
      return responseData?.data || null;
    },
    retry: false,
  });
}

export function useBulkUpdateViolations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status, projectId }: { ids: string[]; status: ViolationStatus; projectId?: string }) => {
      const result = await api.bulkUpdateViolations(ids, status, projectId);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: { updated: number } };
      return responseData?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateViolationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ViolationStatus }) => {
      const result = await api.updateViolationStatus(id, status);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: Violation };
      return responseData?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
