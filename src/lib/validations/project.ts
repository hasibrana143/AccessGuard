import { z } from 'zod';

// Crawl config schema
const crawlConfigSchema = z.object({
  maxPages: z
    .number()
    .int('Max pages must be an integer')
    .min(1, 'Max pages must be at least 1')
    .max(1000, 'Max pages cannot exceed 1000')
    .optional()
    .default(100),
  excludePaths: z
    .array(z.string())
    .max(50, 'Cannot have more than 50 exclude paths')
    .optional()
    .default([]),
  includeSubdomains: z
    .boolean()
    .optional()
    .default(false),
}).optional();

// URL validation regex - accepts http and https URLs
const urlRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}(\/[^\s]*)?$/i;

// Create project schema
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must be less than 100 characters')
    .trim(),
  url: z
    .string()
    .min(1, 'URL is required')
    .max(500, 'URL must be less than 500 characters')
    .refine(
      (val) => {
        // Try to parse as URL
        try {
          const url = new URL(val.startsWith('http') ? val : `https://${val}`);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          // Also allow URLs without protocol
          return urlRegex.test(val);
        }
      },
      { message: 'Invalid URL format' }
    )
    .transform(val => {
      // Ensure URL has protocol
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        return `https://${val}`;
      }
      return val;
    }),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  crawlConfig: crawlConfigSchema,
  orgSlug: z
    .string()
    .max(100, 'Organization slug must be less than 100 characters')
    .optional()
    .default('demo-org'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// Project query schema for GET requests
export const projectQuerySchema = z.object({
  orgId: z
    .string()
    .max(100, 'Organization ID must be less than 100 characters')
    .optional(),
});

export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
