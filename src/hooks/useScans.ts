'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from './query-keys';
import type { Scan } from '@/types';

export function useScans(projectId?: string, limit = 20) {
  const { data } = useQuery({
    queryKey: queryKeys.scans(projectId),
    queryFn: async (): Promise<Scan[]> => {
      const result = await api.getScans(projectId, undefined, limit);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: Scan[] };
      return responseData?.data || [];
    },
    retry: false,
    placeholderData: [],
    refetchInterval: (query) => {
      const scans = query.state.data as Scan[] | undefined;
      if (!scans) return false;
      const hasActive = scans.some(s => s.status === 'running' || s.status === 'queued');
      return hasActive ? 3000 : false;
    },
  });
  return { data, isLoading: data === undefined };
}

export function useCreateScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const result = await api.createScan(projectId);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { scan?: { id: string; status: string; violationsFound: number; pagesScanned: number }; project?: { id: string; riskScore: number } };
      return responseData;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scans(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: ['violations'] });
    },
  });
}
