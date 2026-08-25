/**
 * Data Transfer Objects (DTOs)
 * 
 * Clean separation between API layer and domain layer.
 * Handles serialization, validation, and transformation.
 * 
 * Features:
 * - Type-safe DTOs
 * - Automatic validation
 * - Serialization/deserialization
 * - Partial updates support
 * 
 * Usage:
 *   import { CreateProjectDTO, ProjectDTO } from '@/lib/dto';
 *   
 *   const dto = new CreateProjectDTO({
 *     name: 'My Project',
 *     url: 'https://example.com',
 *   });
 *   
 *   if (dto.isValid()) {
 *     const data = dto.toData();
 *     await createProject(data);
 *   }
 */

import { z } from 'zod';
import { logger } from './error-logger';

export interface DTOValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Base DTO class
 */
export abstract class BaseDTO<T> {
  protected data: Partial<T>;
  protected errors: Record<string, string[]> = {};

  constructor(data: Partial<T>) {
    this.data = data;
  }

  /**
   * Get raw data
   */
  getData(): Partial<T> {
    return { ...this.data };
  }

  /**
   * Get validated data
   */
  abstract toData(): T;

  /**
   * Check if DTO is valid
   */
  abstract isValid(): boolean;

  /**
   * Get validation errors
   */
  getErrors(): Record<string, string[]> {
    return { ...this.errors };
  }

  /**
   * Format Zod errors
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected formatErrors(zodError: any): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    const issues = zodError?.issues || [];
    for (const issue of issues) {
      const path = (issue.path || []).join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    }
    return errors;
  }

  /**
   * Get validation result
   */
  validate(): DTOValidationResult {
    return {
      valid: this.isValid(),
      errors: this.getErrors(),
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.data);
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON<T>(json: string): Partial<T> {
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }
}

// ==================== Project DTOs ====================

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  description: z.string().max(500).optional(),
  teamId: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

export interface CreateProjectData {
  name: string;
  url: string;
  description?: string;
  teamId?: string;
}

export interface UpdateProjectData {
  name?: string;
  url?: string;
  description?: string;
}

export interface ProjectData {
  id: string;
  name: string;
  url: string;
  description?: string;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CreateProjectDTO extends BaseDTO<CreateProjectData> {
  constructor(data: Partial<CreateProjectData>) {
    super(data);
  }

  isValid(): boolean {
    const result = CreateProjectSchema.safeParse(this.data);
    if (!result.success) {
      this.errors = this.formatErrors(result.error);
      return false;
    }
    this.errors = {};
    return true;
  }

  toData(): CreateProjectData {
    return CreateProjectSchema.parse(this.data);
  }
}

export class UpdateProjectDTO extends BaseDTO<UpdateProjectData> {
  constructor(data: Partial<UpdateProjectData>) {
    super(data);
  }

  isValid(): boolean {
    const result = UpdateProjectSchema.safeParse(this.data);
    if (!result.success) {
      this.errors = this.formatErrors(result.error);
      return false;
    }
    this.errors = {};
    return true;
  }

  toData(): UpdateProjectData {
    return UpdateProjectSchema.parse(this.data);
  }

  /**
   * Get only defined fields for partial update
   */
  toPartialData(): Partial<UpdateProjectData> {
    const data = this.toData();
    const partial: Partial<UpdateProjectData> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        (partial as Record<string, unknown>)[key] = value;
      }
    }
    
    return partial;
  }
}

// ==================== Scan DTOs ====================

const CreateScanSchema = z.object({
  projectId: z.string().min(1),
  url: z.string().url().optional(),
  options: z.object({
    maxPages: z.number().min(1).max(1000).default(100),
    includeSubdomains: z.boolean().default(false),
  }).optional(),
});

export interface CreateScanData {
  projectId: string;
  url?: string;
  options?: {
    maxPages: number;
    includeSubdomains: boolean;
  };
}

export class CreateScanDTO extends BaseDTO<CreateScanData> {
  constructor(data: Partial<CreateScanData>) {
    super(data);
  }

  isValid(): boolean {
    const result = CreateScanSchema.safeParse(this.data);
    if (!result.success) {
      this.errors = this.formatErrors(result.error);
      return false;
    }
    this.errors = {};
    return true;
  }

  toData(): CreateScanData {
    return CreateScanSchema.parse(this.data);
  }
}

// ==================== Violation DTOs ====================

const UpdateViolationSchema = z.object({
  status: z.enum(['open', 'fixed', 'ignored', 'false_positive']).optional(),
  notes: z.string().max(1000).optional(),
});

export interface UpdateViolationData {
  status?: 'open' | 'fixed' | 'ignored' | 'false_positive';
  notes?: string;
}

export class UpdateViolationDTO extends BaseDTO<UpdateViolationData> {
  constructor(data: Partial<UpdateViolationData>) {
    super(data);
  }

  isValid(): boolean {
    const result = UpdateViolationSchema.safeParse(this.data);
    if (!result.success) {
      this.errors = this.formatErrors(result.error);
      return false;
    }
    this.errors = {};
    return true;
  }

  toData(): UpdateViolationData {
    return UpdateViolationSchema.parse(this.data);
  }
}

// ==================== User DTOs ====================

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'member' | 'viewer';
}

export class CreateUserDTO extends BaseDTO<CreateUserData> {
  constructor(data: Partial<CreateUserData>) {
    super(data);
  }

  isValid(): boolean {
    const result = CreateUserSchema.safeParse(this.data);
    if (!result.success) {
      this.errors = this.formatErrors(result.error);
      return false;
    }
    this.errors = {};
    return true;
  }

  toData(): CreateUserData {
    return CreateUserSchema.parse(this.data);
  }

  /**
   * Hash password before sending
   */
  async toSecureData(): Promise<CreateUserData> {
    const data = this.toData();
    // In production, hash password here
    return data;
  }
}

// ==================== Report DTOs ====================

const GenerateReportSchema = z.object({
  projectId: z.string().min(1),
  type: z.enum(['summary', 'detailed', 'compliance']),
  format: z.enum(['pdf', 'html', 'json']).default('pdf'),
  includeRemediation: z.boolean().default(true),
});

export interface GenerateReportData {
  projectId: string;
  type: 'summary' | 'detailed' | 'compliance';
  format: 'pdf' | 'html' | 'json';
  includeRemediation: boolean;
}

export class GenerateReportDTO extends BaseDTO<GenerateReportData> {
  constructor(data: Partial<GenerateReportData>) {
    super(data);
  }

  isValid(): boolean {
    const result = GenerateReportSchema.safeParse(this.data);
    if (!result.success) {
      this.errors = this.formatErrors(result.error);
      return false;
    }
    this.errors = {};
    return true;
  }

  toData(): GenerateReportData {
    return GenerateReportSchema.parse(this.data);
  }
}

// ==================== Helper Functions ====================

/**
 * Create DTO from request body
 */
export function createDTO<T>(
  DTOClass: new (data: Partial<T>) => BaseDTO<T>,
  data: Record<string, unknown>
): BaseDTO<T> {
  return new DTOClass(data as Partial<T>);
}

/**
 * Validate and return data or throw
 */
export function validateDTO<T>(dto: BaseDTO<T>): T {
  if (!dto.isValid()) {
    throw new ValidationError(dto.getErrors());
  }
  return dto.toData();
}

/**
 * Validation error
 */
export class ValidationError extends Error {
  errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
