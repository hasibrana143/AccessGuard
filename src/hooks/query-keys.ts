// Shared React Query keys for AccessGuard
export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  violations: (filters?: Record<string, unknown>) => ['violations', filters] as const,
  violation: (id: string) => ['violations', id] as const,
  scans: (projectId?: string, limit?: number) => ['scans', projectId, limit] as const,
  stats: (projectId?: string, orgSlug?: string) => ['stats', projectId, orgSlug] as const,
  trends: (projectId?: string, days?: number) => ['trends', projectId, days] as const,
  manualChecks: (projectId?: string) => ['manual-checks', projectId] as const,
};
