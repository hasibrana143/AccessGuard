import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  url: z.string().url('Invalid URL format'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  orgSlug: z.string().optional(),
  crawlConfig: z.object({
    maxPages: z.number().min(1).max(1000).default(100),
    excludePaths: z.array(z.string()).default([]),
    includeSubdomains: z.boolean().default(false),
  }).optional(),
  scanConfig: z.object({
    requestDelay: z.number().min(100).max(5000).default(500),
    userAgent: z.string().default('default'),
    timeout: z.number().min(5000).max(60000).default(30000),
    retryCount: z.number().min(0).max(5).default(3),
  }).optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const DeleteProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
});

export const ProjectQuerySchema = z.object({
  orgId: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});
