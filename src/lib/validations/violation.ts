import { z } from 'zod';
import { ViolationStatus } from '@/types';

// Status enum values
const statusValues: [ViolationStatus, ...ViolationStatus[]] = ['open', 'fixed', 'ignored', 'false_positive'];
const severityValues = ['critical', 'serious', 'moderate', 'minor'] as const;

// Update violation status schema
export const updateViolationStatusSchema = z.object({
  id: z
    .string()
    .min(1, 'Violation ID is required')
    .max(100, 'Violation ID must be less than 100 characters'),
  status: z.enum(statusValues, {
    errorMap: () => ({ message: 'Invalid status. Must be one of: open, fixed, ignored, false_positive' }),
  }),
  fixedAt: z
    .string()
    .datetime('Invalid date format for fixedAt')
    .optional()
    .transform(val => val ? new Date(val) : undefined),
});

export type UpdateViolationStatusInput = z.infer<typeof updateViolationStatusSchema>;

// Violation query schema for GET requests
export const violationQuerySchema = z.object({
  projectId: z
    .string()
    .max(100, 'Project ID must be less than 100 characters')
    .optional(),
  severity: z
    .enum(severityValues, {
      errorMap: () => ({ message: 'Invalid severity. Must be one of: critical, serious, moderate, minor' }),
    })
    .optional()
    .or(z.literal('all')),
  status: z
    .enum(statusValues, {
      errorMap: () => ({ message: 'Invalid status. Must be one of: open, fixed, ignored, false_positive' }),
    })
    .optional()
    .or(z.literal('all')),
  ruleId: z
    .string()
    .max(100, 'Rule ID must be less than 100 characters')
    .optional(),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(50),
  offset: z
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .optional()
    .default(0),
});

export type ViolationQueryInput = z.infer<typeof violationQuerySchema>;

// Violation stats schema for POST requests
export const violationStatsSchema = z.object({
  projectId: z
    .string()
    .max(100, 'Project ID must be less than 100 characters')
    .optional(),
  orgSlug: z
    .string()
    .max(100, 'Organization slug must be less than 100 characters')
    .optional()
    .default('demo-org'),
});

export type ViolationStatsInput = z.infer<typeof violationStatsSchema>;
