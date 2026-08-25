import { z } from 'zod';

export const ViolationStatusSchema = z.enum(['open', 'fixed', 'ignored', 'false_positive']);
export const ViolationSeveritySchema = z.enum(['critical', 'serious', 'moderate', 'minor']);

export const GetViolationsSchema = z.object({
  projectId: z.string().optional(),
  severity: ViolationSeveritySchema.optional(),
  status: ViolationStatusSchema.optional(),
  ruleId: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const UpdateViolationSchema = z.object({
  id: z.string().min(1, 'Violation ID is required'),
  status: ViolationStatusSchema,
});

export const BulkUpdateViolationsSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one violation ID is required'),
  status: ViolationStatusSchema,
  projectId: z.string(),
});

export const ViolationQuerySchema = z.object({
  projectId: z.string().optional(),
  severity: ViolationSeveritySchema.optional(),
  status: ViolationStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});
