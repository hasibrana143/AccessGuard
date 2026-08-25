// Backward-compatible re-exports — all consumers import from here
// Actual implementation is in focused hook files (useProjects, useViolations, etc.)
export { queryKeys } from './query-keys';
export type { TrendDataPoint } from './useTrends';
export type { ScanProgress } from './useScanProgress';

export { useProjects, useProject, useCreateProject } from './useProjects';
export { useViolations, useViolationStats, useBulkUpdateViolations, useUpdateViolationStatus } from './useViolations';
export { useScans, useCreateScan } from './useScans';
export { useRemediation, useGenerateRemediation, useVerifyProject } from './useRemediation';
export { useTrendData } from './useTrends';
export { useScanProgress } from './useScanProgress';
