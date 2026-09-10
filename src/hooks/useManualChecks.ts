'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from './query-keys';
import type { ManualCheckItem, ManualCheckSaveItem } from '@/types';

export function useManualChecks(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.manualChecks(projectId),
    queryFn: async (): Promise<ManualCheckItem[]> => {
      if (!projectId) return [];
      const result = await api.getManualChecks(projectId);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: ManualCheckItem[] };
      return responseData?.data || [];
    },
    enabled: Boolean(projectId),
    retry: false,
    placeholderData: [],
  });
}

export function useSaveManualChecks(projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (results: ManualCheckSaveItem[]) => {
      if (!projectId) throw new Error('Project ID is required');
      const result = await api.saveManualChecks(projectId, results);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manualChecks(projectId) });
    },
  });
}
