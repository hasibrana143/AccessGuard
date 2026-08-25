'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from './query-keys';
import type { RemediationResponse } from '@/types';

export function useRemediation(violationId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['remediation', violationId],
    queryFn: async (): Promise<RemediationResponse | null> => {
      if (!violationId) return null;
      const result = await api.getRemediation(violationId);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: RemediationResponse };
      return responseData?.data || null;
    },
    enabled: !!violationId && enabled,
    retry: false,
  });
}

export function useGenerateRemediation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ violationId, forceRegenerate = false }: { violationId: string; forceRegenerate?: boolean }) => {
      const result = await api.getRemediation(violationId, forceRegenerate);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: RemediationResponse };
      return responseData?.data;
    },
    onSuccess: (_, { violationId }) => {
      queryClient.invalidateQueries({ queryKey: ['remediation', violationId] });
      queryClient.invalidateQueries({ queryKey: ['violations'] });
    },
  });
}

export function useVerifyProject() {
  const queryClient = useQueryClient();

  const generateToken = useMutation({
    mutationFn: async (projectId: string) => {
      const result = await api.generateVerificationToken(projectId);
      if (!result.success) throw new Error(result.error);
      return (result.data as { data?: unknown }).data;
    },
  });

  const checkStatus = useMutation({
    mutationFn: async (projectId: string) => {
      const result = await api.checkVerificationStatus(projectId);
      if (!result.success) throw new Error(result.error);
      return (result.data as { data?: { verified: boolean; message?: string } }).data;
    },
    onSuccess: (data) => {
      if (data?.verified) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      }
    },
  });

  return { generateToken, checkStatus };
}
