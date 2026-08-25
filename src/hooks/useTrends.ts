'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

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
