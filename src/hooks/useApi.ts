// React Query Hooks for AccessGuard
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateProjectInput, Severity, ViolationStatus } from '@/types';

// Query Keys
export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  violations: (filters?: Record<string, unknown>) => ['violations', filters] as const,
  violation: (id: string) => ['violations', id] as const,
  scans: (projectId?: string) => ['scans', projectId] as const,
  stats: (projectId?: string) => ['stats', projectId] as const,
};

// Projects
export function useProjects(orgSlug = 'demo-org') {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const result = await api.getProjects(orgSlug);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    // Don't retry on auth errors
    retry: false,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async () => {
      const result = await api.getProject(id);
      if (!result.success) throw new Error(result.error);
      return result.data!;
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
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

// Violations
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
    queryFn: async () => {
      const result = await api.getViolations(params);
      if (!result.success) throw new Error(result.error);
      // Return just the data array, not the full response
      return result.data!;
    },
    // Don't retry on auth errors
    retry: false,
    // Return empty array on error instead of throwing
    placeholderData: [],
  });
}

export function useViolationStats(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.stats(projectId),
    queryFn: async () => {
      const result = await api.getViolationStats(projectId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    retry: false,
  });
}

export function useUpdateViolationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ViolationStatus }) => {
      const result = await api.updateViolationStatus(id, status);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// Scans
export function useScans(projectId?: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.scans(projectId),
    queryFn: async () => {
      const result = await api.getScans(projectId, undefined, limit);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    retry: false,
    placeholderData: [],
  });
}

export function useCreateScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const result = await api.createScan(projectId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scans(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: ['violations'] });
    },
  });
}

// Remediation
export function useRemediation(violationId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['remediation', violationId],
    queryFn: async () => {
      if (!violationId) return null;
      const result = await api.getRemediation(violationId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
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
      return result.data!;
    },
    onSuccess: (_, { violationId }) => {
      queryClient.invalidateQueries({ queryKey: ['remediation', violationId] });
      queryClient.invalidateQueries({ queryKey: ['violations'] });
    },
  });
}
