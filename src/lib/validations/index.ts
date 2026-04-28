// Zod validation schemas for AccessGuard API
import { z } from 'zod';

// Auth validations
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password is required').max(100),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  name: z.string().min(1, 'Name is required').max(100),
  organizationName: z.string().max(100).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

// Project validations
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  url: z.string().url('Invalid URL').max(500).transform(url => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }),
  description: z.string().max(500).optional(),
  crawlConfig: z.object({
    maxPages: z.number().min(1).max(1000).optional(),
    excludePaths: z.array(z.string()).optional(),
    includeSubdomains: z.boolean().optional(),
  }).optional(),
  orgSlug: z.string().optional(),
});

export const projectQuerySchema = z.object({
  orgId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// Violation validations
export const updateViolationStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['open', 'fixed', 'ignored', 'false_positive']),
});

export const violationQuerySchema = z.object({
  projectId: z.string().optional(),
  severity: z.enum(['critical', 'serious', 'moderate', 'minor', 'all']).optional(),
  status: z.enum(['open', 'fixed', 'ignored', 'false_positive', 'all']).optional(),
  ruleId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const violationStatsSchema = z.object({
  projectId: z.string().optional(),
  orgSlug: z.string().optional(),
});

// Scan validations
export const createScanSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
});

export const scanQuerySchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'all']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const updateScanStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  pagesScanned: z.number().optional(),
  violationsFound: z.number().optional(),
  errorMessage: z.string().optional(),
});

// Team validations
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export const updateMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['admin', 'member', 'viewer']),
});

// Schedule validations
export const createScheduleSchema = z.object({
  projectId: z.string().min(1),
  cron: z.string().min(1, 'Cron expression is required'),
  enabled: z.boolean().default(true),
});

export const updateScheduleSchema = z.object({
  cron: z.string().optional(),
  enabled: z.boolean().optional(),
});

// Report validations
export const createReportSchema = z.object({
  projectId: z.string().min(1),
  reportType: z.enum(['full', 'summary', 'legal']).default('full'),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
});
