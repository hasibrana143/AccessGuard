import { z } from 'zod';
import { ScanStatus } from '@/types';

// Status enum values
const scanStatusValues: [ScanStatus, ...ScanStatus[]] = ['pending', 'running', 'completed', 'failed'];

// Create scan schema
export const createScanSchema = z.object({
  projectId: z
    .string()
    .min(1, 'Project ID is required')
    .max(100, 'Project ID must be less than 100 characters'),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

// Scan query schema for GET requests
export const scanQuerySchema = z.object({
  projectId: z
    .string()
    .max(100, 'Project ID must be less than 100 characters')
    .optional(),
  status: z
    .enum(scanStatusValues, {
      errorMap: () => ({ message: 'Invalid status. Must be one of: pending, running, completed, failed' }),
    })
    .optional(),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
});

export type ScanQueryInput = z.infer<typeof scanQuerySchema>;

// Update scan status schema
export const updateScanStatusSchema = z.object({
  id: z
    .string()
    .min(1, 'Scan ID is required')
    .max(100, 'Scan ID must be less than 100 characters'),
  status: z.enum(scanStatusValues, {
    errorMap: () => ({ message: 'Invalid status. Must be one of: pending, running, completed, failed' }),
  }),
});

export type UpdateScanStatusInput = z.infer<typeof updateScanStatusSchema>;
