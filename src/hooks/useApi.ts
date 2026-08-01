// React Query Hooks for AccessGuard
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import type { CreateProjectInput, Severity, ViolationStatus, Project, Violation, Scan, ViolationStats, RemediationResponse } from '@/types';
import { logger } from '@/lib/error-logger';

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
          logger.warn('Organization not found, user session may be stale');
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

// Scans
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
      // API returns { success: true, data: { scan: {...}, project: {...} } }
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

// Domain Verification
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

// Scan Progress via SSE
export interface ScanProgress {
  status: string;
  pagesScanned: number;
  violationsFound: number;
  errorMessage?: string;
}

export function useScanProgress(scanId: string | null) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    setProgress(null);
    setIsDone(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!scanId) return;

    const es = new EventSource(`/api/scans/progress?scanId=${scanId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setProgress({
            status: data.status,
            pagesScanned: data.pagesScanned,
            violationsFound: data.violationsFound,
            errorMessage: data.errorMessage,
          });
        } else if (data.type === 'done') {
          setIsDone(true);
          es.close();
        } else if (data.type === 'error') {
          setError(data.message);
          es.close();
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      setError('Connection lost');
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [scanId]);

  return { progress, isDone, error, reset };
}
