// React Query hooks for compliance reports
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const reportKeys = {
  all: ['reports'] as const,
};

export interface ComplianceReport {
  id: string;
  projectId: string;
  reportType: string;
  status: string;
  metadata: string;
  createdAt: string;
  project?: { name: string };
}

// Get all reports
export function useReportList(enabled = true) {
  return useQuery({
    queryKey: reportKeys.all,
    queryFn: async (): Promise<ComplianceReport[]> => {
      const res = await fetch('/api/reports/generate');
      const data = await res.json();
      return data.data || [];
    },
    enabled,
  });
}

// Generate report
export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, reportType, dateRange }: { 
      projectId: string; 
      reportType?: string; 
      dateRange?: { start: string; end: string } 
    }) => {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, reportType, dateRange }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

// Delete report
export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reports/generate?id=${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

// Download report directly
export function downloadReportDirect(reportId: string): void {
  window.open(`/api/reports/download?id=${reportId}`, '_blank');
}
