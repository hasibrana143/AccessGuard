// React Query Hooks for AccessGuard
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { CreateProjectInput, Severity, ViolationStatus, Project, Violation, Scan, ViolationStats, RemediationResponse } from '@/types';

// Query Keys
export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  violations: (filters?: Record<string, unknown>) => ['violations', filters] as const,
  violation: (id: string) => ['violations', id] as const,
  scans: (projectId?: string) => ['scans', projectId] as const,
  stats: (projectId?: string) => ['stats', projectId] as const,
  trends: (projectId?: string, days?: number) => ['trends', projectId, days] as const,
};

// Trend data type
export interface TrendDataPoint {
  date: string;
  violations: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  fixed: number;
  scans: number;
}

// Projects
export function useProjects(orgSlug = 'default-org') {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async (): Promise<Project[]> => {
      const result = await api.getProjects(orgSlug);
      if (!result.success) {
        // If organization not found, return empty array - user needs to re-login
        if (result.status === 404) {
          console.warn('Organization not found, user session may be stale');
          return [];
        }
        throw new Error(result.error);
      }
      // API returns { success, data: { success, data: [...], pagination } }
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
    queryFn: async (): Promise<Violation[]> => {
      const result = await api.getViolations(params);
      if (!result.success) throw new Error(result.error);
      // API returns { success, data: { success, data: [...], pagination } }
      const responseData = result.data as { data?: Violation[] };
      return responseData?.data || [];
    },
    retry: false,
    placeholderData: [],
  });
}

export function useViolationStats(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.stats(projectId),
    queryFn: async (): Promise<ViolationStats | null> => {
      const result = await api.getViolationStats(projectId);
      if (!result.success) throw new Error(result.error);
      const responseData = result.data as { data?: ViolationStats };
      return responseData?.data || null;
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
      const responseData = result.data as { data?: Violation };
      return responseData?.data;
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
    queryFn: async (): Promise<Scan[]> => {
      const result = await api.getScans(projectId, undefined, limit);
      if (!result.success) throw new Error(result.error);
      // API returns { success, data: { success, data: [...] } }
      const responseData = result.data as { data?: Scan[] };
      return responseData?.data || [];
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
      const responseData = result.data as { data?: Scan };
      return responseData?.data;
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

// Trends
export function useTrendData(projectId?: string, days = 30) {
  return useQuery({
    queryKey: queryKeys.trends(projectId, days),
    queryFn: async (): Promise<TrendDataPoint[]> => {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      params.append('days', String(days));
      
      const response = await fetch(`/api/stats/trends?${params}`);
      const result = await response.json();
      
      if (!result.success) throw new Error(result.error);
      return result.data || [];
    },
    retry: false,
    placeholderData: [],
  });
}
