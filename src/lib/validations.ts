import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const idSchema = z.string().cuid();

// ============================================================================
// Auth Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  organizationName: z.string().min(2, 'Organization name is required').max(100),
});

// ============================================================================
// Project Schemas
// ============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  url: z.string().url('Must be a valid URL'),
  description: z.string().max(500).optional(),
  crawlConfig: z.object({
    maxPages: z.number().int().min(1).max(1000).default(100),
    excludePaths: z.array(z.string()).default([]),
    includeSubdomains: z.boolean().default(false),
  }).optional(),
  orgSlug: z.string().optional(),
});

export const updateProjectSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  description: z.string().max(500).nullable().optional(),
  crawlConfig: z.object({
    maxPages: z.number().int().min(1).max(1000),
    excludePaths: z.array(z.string()),
    includeSubdomains: z.boolean(),
  }).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// Violation Schemas
// ============================================================================

export const severitySchema = z.enum(['critical', 'serious', 'moderate', 'minor']);
export const violationStatusSchema = z.enum(['open', 'fixed', 'ignored', 'false_positive']);

export const getViolationsSchema = paginationSchema.extend({
  projectId: z.string().optional(),
  severity: z.union([severitySchema, z.literal('all')]).optional(),
  status: z.union([violationStatusSchema, z.literal('all')]).optional(),
  ruleId: z.string().optional(),
});

export const updateViolationSchema = z.object({
  id: z.string().cuid(),
  status: violationStatusSchema,
  fixedAt: z.string().datetime().optional(),
});

export const violationStatsSchema = z.object({
  projectId: z.string().optional(),
  orgSlug: z.string().optional(),
});

// ============================================================================
// Scan Schemas
// ============================================================================

export const scanStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

export const getScansSchema = paginationSchema.extend({
  projectId: z.string().optional(),
  status: scanStatusSchema.optional(),
});

export const createScanSchema = z.object({
  projectId: z.string().cuid(),
});

// ============================================================================
// Remediation Schemas
// ============================================================================

export const remediationSchema = z.object({
  violationId: z.string().cuid(),
  forceRegenerate: z.boolean().optional().default(false),
});

// ============================================================================
// Validation Helper
// ============================================================================

import { NextResponse } from 'next/server';

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: NextResponse };

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      ),
    };
  }
  
  return { success: true, data: result.data };
}

// Helper for validating search params
export function validateSearchParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): ValidationResult<T> {
  const params: Record<string, string> = {};
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  return validate(schema, params);
}
