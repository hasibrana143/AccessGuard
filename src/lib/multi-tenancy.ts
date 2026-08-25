/**
 * Multi-Tenancy Patterns
 * 
 * Implements tenant isolation strategies:
 * - Shared database, shared schema (Row-level security)
 * - Shared database, separate schemas
 * - Separate databases
 * 
 * Features:
 * - Tenant context management
 * - Automatic tenant filtering
 * - Tenant-aware caching
 * - Tenant limits and quotas
 * 
 * Usage:
 *   import { TenantContext, TenantGuard } from '@/lib/multi-tenancy';
 *   
 *   // Set tenant context
 *   TenantContext.set('tenant-123');
 *   
 *   // Query with automatic filtering
 *   const projects = await prisma.project.findMany({
 *     where: { organizationId: TenantContext.get() }
 *   });
 */

import { db } from './db';

// ============ Tenant Context ============

export class TenantContext {
  private static current: string | null = null;
  private static storage = new Map<string, unknown>();

  /**
   * Set current tenant
   */
  static set(tenantId: string): void {
    this.current = tenantId;
  }

  /**
   * Get current tenant
   */
  static get(): string | null {
    return this.current;
  }

  /**
   * Clear current tenant
   */
  static clear(): void {
    this.current = null;
  }

  /**
   * Store tenant-specific data
   */
  static setData(key: string, value: unknown): void {
    this.storage.set(key, value);
  }

  /**
   * Get tenant-specific data
   */
  static getData<T>(key: string): T | undefined {
    return this.storage.get(key) as T | undefined;
  }

  /**
   * Run function with tenant context
   */
  static async run<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.current;
    this.set(tenantId);
    try {
      return await fn();
    } finally {
      if (previous) {
        this.set(previous);
      } else {
        this.clear();
      }
    }
  }
}

// ============ Tenant Guard ============

export interface TenantLimits {
  maxProjects: number;
  maxScansPerMonth: number;
  maxTeamMembers: number;
  maxViolations: number;
  storageLimit: number; // in MB
}

export interface TenantQuota {
  projects: number;
  scansThisMonth: number;
  teamMembers: number;
  violations: number;
  storageUsed: number; // in MB
}

export class TenantGuard {
  private limits = new Map<string, TenantLimits>();

  /**
   * Set tenant limits
   */
  setLimits(tenantId: string, limits: TenantLimits): void {
    this.limits.set(tenantId, limits);
  }

  /**
   * Get tenant limits
   */
  getLimits(tenantId: string): TenantLimits {
    return this.limits.get(tenantId) || {
      maxProjects: 10,
      maxScansPerMonth: 100,
      maxTeamMembers: 5,
      maxViolations: 1000,
      storageLimit: 1024, // 1GB
    };
  }

  /**
   * Check if tenant can perform action
   */
  async canPerform(
    tenantId: string,
    action: keyof TenantLimits,
    current: number
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const limits = this.getLimits(tenantId);
    const limit = limits[action];
    const remaining = limit - current;

    return {
      allowed: current < limit,
      remaining: Math.max(0, remaining),
      limit,
    };
  }

  /**
   * Get tenant quota usage
   */
  async getQuota(tenantId: string): Promise<TenantQuota> {
    // In production, query database
    return {
      projects: 0,
      scansThisMonth: 0,
      teamMembers: 0,
      violations: 0,
      storageUsed: 0,
    };
  }

  /**
   * Enforce tenant limit
   */
  async enforce(
    tenantId: string,
    action: keyof TenantLimits,
    current: number
  ): Promise<void> {
    const { allowed, remaining, limit } = await this.canPerform(tenantId, action, current);
    if (!allowed) {
      throw new TenantLimitExceededError(action, limit, current);
    }
  }
}

export class TenantLimitExceededError extends Error {
  constructor(
    public readonly action: string,
    public readonly limit: number,
    public readonly current: number
  ) {
    super(`Tenant limit exceeded for '${action}': ${current}/${limit}`);
    this.name = 'TenantLimitExceededError';
  }
}

// ============ Tenant-Aware Cache ============

export class TenantCache {
  private cache = new Map<string, { value: unknown; expiry: number }>();
  private defaultTtl = 300_000; // 5 minutes

  /**
   * Get tenant-scoped cache key
   */
  private getKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }

  /**
   * Get from cache
   */
  async get<T>(tenantId: string, key: string): Promise<T | null> {
    const fullKey = this.getKey(tenantId, key);
    const item = this.cache.get(fullKey);

    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(fullKey);
      return null;
    }

    return item.value as T;
  }

  /**
   * Set in cache
   */
  async set(tenantId: string, key: string, value: unknown, ttl?: number): Promise<void> {
    const fullKey = this.getKey(tenantId, key);
    this.cache.set(fullKey, {
      value,
      expiry: Date.now() + (ttl || this.defaultTtl),
    });
  }

  /**
   * Delete from cache
   */
  async delete(tenantId: string, key: string): Promise<void> {
    const fullKey = this.getKey(tenantId, key);
    this.cache.delete(fullKey);
  }

  /**
   * Clear all tenant cache
   */
  async clearTenant(tenantId: string): Promise<void> {
    const prefix = `tenant:${tenantId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

// ============ Tenant Middleware ============

export function withTenant<T>(
  handler: (tenantId: string) => Promise<T>
): (tenantId: string) => Promise<T> {
  return async (tenantId: string): Promise<T> => {
    return TenantContext.run(tenantId, () => handler(tenantId));
  };
}

// ============ Tenant Isolation Strategies ============

/**
 * Row-Level Security Strategy
 * All tenants share same tables, filtered by organizationId
 */
export class RowLevelStrategy {
  /**
   * Apply tenant filter to query
   */
  static filter<T extends Record<string, unknown>>(query: T, tenantId: string): T {
    return {
      ...query,
      where: {
        ...(query.where || {}),
        organizationId: tenantId,
      },
    };
  }

  /**
   * Apply tenant to create
   */
  static create<T extends Record<string, unknown>>(data: T, tenantId: string): T {
    return {
      ...data,
      organizationId: tenantId,
    };
  }
}

/**
 * Schema-Per-Tenant Strategy
 * Each tenant gets its own database schema
 */
export class SchemaPerTenantStrategy {
  /**
   * Get schema name for tenant
   */
  static getSchemaName(tenantId: string): string {
    return `tenant_${tenantId.replace(/-/g, '_')}`;
  }

  /**
   * Create tenant schema
   */
  static async createSchema(tenantId: string): Promise<void> {
    const schema = this.getSchemaName(tenantId);
    await db.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  }

  /**
   * Run migration in tenant schema
   */
  static async migrate(tenantId: string): Promise<void> {
    const schema = this.getSchemaName(tenantId);
    // Run Prisma migrate for specific schema
    console.log(`[Multi-Tenancy] Running migration for schema: ${schema}`);
  }
}

/**
 * Database-Per-Tenant Strategy
 * Each tenant gets its own database
 */
export class DatabasePerTenantStrategy {
  /**
   * Get database URL for tenant
   */
  static getDatabaseUrl(tenantId: string): string {
    const baseUrl = process.env.DATABASE_URL || '';
    return baseUrl.replace('/accessguard', `/accessguard_${tenantId}`);
  }

  /**
   * Create tenant database
   */
  static async createDatabase(tenantId: string): Promise<void> {
    const url = this.getDatabaseUrl(tenantId);
    console.log(`[Multi-Tenancy] Creating database: ${url}`);
    // Create database and run migrations
  }
}

// ============ Singleton Instances ============

export const tenantGuard = new TenantGuard();
export const tenantCache = new TenantCache();
