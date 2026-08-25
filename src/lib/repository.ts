/**
 * Repository Pattern
 * 
 * Abstracts data access layer from business logic.
 * Provides consistent interface for CRUD operations.
 * 
 * Features:
 * - Generic repository interface
 * - Pagination support
 * - Filtering and sorting
 * - Transaction support
 * - Caching integration
 * 
 * Usage:
 *   import { ProjectRepository } from '@/lib/repository';
 *   
 *   const repo = new ProjectRepository();
 *   const projects = await repo.findAll({ page: 1, limit: 10 });
 *   const project = await repo.findById('123');
 */

import { db as prisma } from './db';
import { getRedis } from './redis';
import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FilterOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

export interface FindOptions extends PaginationOptions, FilterOptions {}

export interface IRepository<T, TCreate, TUpdate> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindOptions): Promise<PaginatedResult<T>>;
  create(data: TCreate): Promise<T>;
  update(id: string, data: TUpdate): Promise<T>;
  delete(id: string): Promise<void>;
  count(filters?: Record<string, unknown>): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Base Repository
 */
export abstract class BaseRepository<T, TCreate, TUpdate> implements IRepository<T, TCreate, TUpdate> {
  protected modelName: string;
  protected cachePrefix: string;
  protected defaultCacheTtl = 60; // 1 minute

  constructor(modelName: string) {
    this.modelName = modelName;
    this.cachePrefix = `repo:${modelName}`;
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<T | null> {
    const cacheKey = `${this.cachePrefix}:${id}`;
    
    // Check cache
    const cached = await this.getFromCache<T>(cacheKey);
    if (cached) {
      metrics.increment(`${metricNames.REPO_CACHE_HITS}.find`, 1, { model: this.modelName });
      return cached;
    }

    const startTime = performance.now();
    
    try {
      const result = await this.doFindById(id);
      const duration = performance.now() - startTime;

      metrics.observe(`${metricNames.REPO_QUERY_DURATION}.findById`, duration, { model: this.modelName });

      if (result) {
        await this.setCache(cacheKey, result, this.defaultCacheTtl);
      }

      return result;
    } catch (error) {
      logger.error({ model: this.modelName, id, error: error instanceof Error ? error.message : 'Unknown' },
        'Repository findById failed');
      throw error;
    }
  }

  /**
   * Find all with pagination
   */
  async findAll(options?: FindOptions): Promise<PaginatedResult<T>> {
    const opts: FindOptions = {
      page: 1,
      limit: 10,
      ...options,
    };

    const startTime = performance.now();

    try {
      const result = await this.doFindAll(opts);
      const duration = performance.now() - startTime;

      metrics.observe(`${metricNames.REPO_QUERY_DURATION}.findAll`, duration, { model: this.modelName });

      return result;
    } catch (error) {
      logger.error({ model: this.modelName, error: error instanceof Error ? error.message : 'Unknown' },
        'Repository findAll failed');
      throw error;
    }
  }

  /**
   * Create new entity
   */
  async create(data: TCreate): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await this.doCreate(data);
      const duration = performance.now() - startTime;

      metrics.increment(`${metricNames.REPO_OPERATIONS}.create`, 1, { model: this.modelName });
      metrics.observe(`${metricNames.REPO_QUERY_DURATION}.create`, duration, { model: this.modelName });

      // Invalidate list caches
      await this.invalidateListCache();

      return result;
    } catch (error) {
      logger.error({ model: this.modelName, error: error instanceof Error ? error.message : 'Unknown' },
        'Repository create failed');
      throw error;
    }
  }

  /**
   * Update entity
   */
  async update(id: string, data: TUpdate): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await this.doUpdate(id, data);
      const duration = performance.now() - startTime;

      metrics.increment(`${metricNames.REPO_OPERATIONS}.update`, 1, { model: this.modelName });
      metrics.observe(`${metricNames.REPO_QUERY_DURATION}.update`, duration, { model: this.modelName });

      // Invalidate caches
      await this.invalidateCache(id);

      return result;
    } catch (error) {
      logger.error({ model: this.modelName, id, error: error instanceof Error ? error.message : 'Unknown' },
        'Repository update failed');
      throw error;
    }
  }

  /**
   * Delete entity
   */
  async delete(id: string): Promise<void> {
    const startTime = performance.now();

    try {
      await this.doDelete(id);
      const duration = performance.now() - startTime;

      metrics.increment(`${metricNames.REPO_OPERATIONS}.delete`, 1, { model: this.modelName });
      metrics.observe(`${metricNames.REPO_QUERY_DURATION}.delete`, duration, { model: this.modelName });

      // Invalidate caches
      await this.invalidateCache(id);
    } catch (error) {
      logger.error({ model: this.modelName, id, error: error instanceof Error ? error.message : 'Unknown' },
        'Repository delete failed');
      throw error;
    }
  }

  /**
   * Count entities
   */
  async count(filters?: Record<string, unknown>): Promise<number> {
    const startTime = performance.now();

    try {
      const result = await this.doCount(filters);
      const duration = performance.now() - startTime;

      metrics.observe(`${metricNames.REPO_QUERY_DURATION}.count`, duration, { model: this.modelName });

      return result;
    } catch (error) {
      logger.error({ model: this.modelName, error: error instanceof Error ? error.message : 'Unknown' },
        'Repository count failed');
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  // Abstract methods to be implemented by concrete repositories
  protected abstract doFindById(id: string): Promise<T | null>;
  protected abstract doFindAll(options: FindOptions): Promise<PaginatedResult<T>>;
  protected abstract doCreate(data: TCreate): Promise<T>;
  protected abstract doUpdate(id: string, data: TUpdate): Promise<T>;
  protected abstract doDelete(id: string): Promise<void>;
  protected abstract doCount(filters?: Record<string, unknown>): Promise<number>;

  // Cache helpers
  protected async getFromCache<R>(key: string): Promise<R | null> {
    const redis = getRedis();
    if (!redis) return null;

    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  protected async setCache(key: string, value: unknown, ttl: number): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch {
      // Ignore cache errors
    }
  }

  protected async invalidateCache(id: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
      await redis.del(`${this.cachePrefix}:${id}`);
      await this.invalidateListCache();
    } catch {
      // Ignore cache errors
    }
  }

  protected async invalidateListCache(): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
      const keys = await redis.keys(`${this.cachePrefix}:list:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Ignore cache errors
    }
  }
}

/**
 * Project Repository
 */
export class ProjectRepository extends BaseRepository<
  { id: string; name: string; url: string; createdAt: Date },
  { name: string; url: string; description?: string },
  { name?: string; url?: string; description?: string }
> {
  constructor() {
    super('Project');
  }

  protected async doFindById(id: string) {
    return prisma.project.findUnique({ where: { id } });
  }

  protected async doFindAll(options: FindOptions) {
    const { page, limit, search, sortBy, sortOrder } = options;
    const skip = (page - 1) * limit;

    const where = search ? {
      name: { contains: search, mode: 'insensitive' as const },
    } : {};

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' },
      }),
      prisma.project.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  protected async doCreate(data: { name: string; url: string; description?: string }) {
    return prisma.project.create({ data: data as any });
  }

  protected async doUpdate(id: string, data: { name?: string; url?: string; description?: string }) {
    return prisma.project.update({ where: { id }, data });
  }

  protected async doDelete(id: string) {
    await prisma.project.delete({ where: { id } });
  }

  protected async doCount(filters?: Record<string, unknown>) {
    return prisma.project.count();
  }
}

/**
 * Scan Repository
 */
export class ScanRepository extends BaseRepository<
  { id: string; projectId: string; status: string; createdAt: Date },
  { projectId: string; url?: string },
  { status?: string; completedAt?: Date }
> {
  constructor() {
    super('Scan');
  }

  protected async doFindById(id: string) {
    return prisma.scan.findUnique({ where: { id } });
  }

  protected async doFindAll(options: FindOptions) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.scan.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.scan.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  protected async doCreate(data: { projectId: string; url?: string }) {
    return prisma.scan.create({ data: { ...data, status: 'pending' } });
  }

  protected async doUpdate(id: string, data: { status?: string; completedAt?: Date }) {
    return prisma.scan.update({ where: { id }, data });
  }

  protected async doDelete(id: string) {
    await prisma.scan.delete({ where: { id } });
  }

  protected async doCount() {
    return prisma.scan.count();
  }
}

// Repository factory
export const repositories = {
  project: new ProjectRepository(),
  scan: new ScanRepository(),
};
