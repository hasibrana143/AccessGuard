// Barrel re-export for backward compatibility
// All existing imports from '@/hooks/useApi' will continue to work
export { queryKeys } from './query-keys';
export type { TrendDataPoint } from './useTrends';
export type { ScanProgress } from './useScanProgress';

export { useProjects, useProject, useCreateProject } from './useProjects';
export { useViolations, useViolationStats, useBulkUpdateViolations, useUpdateViolationStatus } from './useViolations';
export { useScans, useCreateScan } from './useScans';
export { useRemediation, useGenerateRemediation, useVerifyProject } from './useRemediation';
export { useTrendData } from './useTrends';
export { useScanProgress } from './useScanProgress';
