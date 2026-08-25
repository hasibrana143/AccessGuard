'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { queryKeys } from './query-keys';
import type { CreateProjectInput, Project, Scan } from '@/types';
import { logger } from '@/lib/error-logger';

export function useProjects(orgSlug = 'default-org') {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async (): Promise<Project[]> => {
      const result = await api.getProjects(orgSlug);
      if (!result.success) {
        if (result.status === 404) {
          logger.warn('Organization not found, user session may be stale');
          return [];
        }
        throw new Error(result.error);
      }
      const responseData = result.data as { data?: Project[] };
      return responseData?.data || [];
    },
    retry: false,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async (): Promise<Project | null> => {
      const result = await api.getProject(id);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: Project };
      return responseData?.data || null;
    },
    enabled: !!id,
    retry: false,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const result = await api.createProject(input);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: { project: Project; scan: Scan } };
      return responseData?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
