/**
 * Request Deduplication
 * 
 * Prevents duplicate requests from being processed simultaneously.
 * Useful for preventing double-submits, duplicate payments, etc.
 * 
 * Features:
 * - In-memory deduplication
 * - Redis-backed deduplication
 * - Configurable window
 * - Automatic cleanup
 * 
 * Usage:
 *   import { withDeduplication } from '@/lib/deduplication';
 *   
 *   const result = await withDeduplication('payment-user123', async () => {
 *     return await processPayment();
 *   });
 */

import { getRedis } from './redis';
import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import crypto from 'crypto';

export interface DeduplicationOptions {
  windowMs: number;         // Deduplication window in ms
  prefix: string;           // Key prefix
  onDuplicate?: () => void; // Callback for duplicates
}

export interface DeduplicationResult<T> {
  isFirst: boolean;
  result: T;
  key: string;
}

const DEFAULT_OPTIONS: DeduplicationOptions = {
  windowMs: 5000,  // 5 seconds
  prefix: 'dedup',
};

// In-memory deduplication store
class InMemoryDeduplicationStore {
  private store = new Map<string, { timestamp: number; result?: unknown }>();
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup every 10 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 10000);
  }

  set(key: string, result?: unknown): boolean {
    const now = Date.now();
    const existing = this.store.get(key);

    // Check if within window
    if (existing && now - existing.timestamp < DEFAULT_OPTIONS.windowMs) {
      return false; // Duplicate
    }

    this.store.set(key, { timestamp: now, result });
    return true;
  }

  get(key: string): { timestamp: number; result?: unknown } | undefined {
    const existing = this.store.get(key);
    if (!existing) return undefined;

    // Check if expired
    if (Date.now() - existing.timestamp >= DEFAULT_OPTIONS.windowMs) {
      this.store.delete(key);
      return undefined;
    }

    return existing;
  }

  has(key: string): boolean {
    const existing = this.store.get(key);
    if (!existing) return false;

    // Check if expired
    if (Date.now() - existing.timestamp >= DEFAULT_OPTIONS.windowMs) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store) {
      if (now - value.timestamp >= DEFAULT_OPTIONS.windowMs) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

const memoryStore = new InMemoryDeduplicationStore();

/**
 * Generate deduplication key from request
 */
export function generateDeduplicationKey(
  userId: string,
  action: string,
  payload?: Record<string, unknown>
): string {
  const data = `${userId}:${action}:${payload ? JSON.stringify(payload) : ''}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Check for duplicate using Redis
 */
async function checkRedisDuplicate(key: string, prefix: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const fullKey = `${prefix}:${key}`;
    const result = await redis.get(fullKey);
    return result !== null;
  } catch {
    return false;
  }
}

/**
 * Set key in Redis with TTL
 */
async function setRedisKey(
  key: string,
  ttlMs: number,
  prefix: string
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const fullKey = `${prefix}:${key}`;
    await redis.setex(fullKey, Math.ceil(ttlMs / 1000), '1');
  } catch {
    // Ignore Redis errors
  }
}

/**
 * Execute function with deduplication
 */
export async function withDeduplication<T>(
  key: string,
  fn: () => Promise<T>,
  options?: Partial<DeduplicationOptions>
): Promise<DeduplicationResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const fullKey = `${opts.prefix}:${key}`;

  // Check in-memory first (faster)
  if (memoryStore.has(fullKey)) {
    logger.debug({ key }, 'Deduplication hit (memory)');
    metrics.increment(metricNames.DEDUPLICATION_HIT, 1, { source: 'memory' });

    const existing = memoryStore.get(fullKey);
    opts.onDuplicate?.();

    if (existing?.result !== undefined) {
      return {
        isFirst: false,
        result: existing.result as T,
        key,
      };
    }

    // Result not cached yet, need to wait
    throw new DeduplicationError(`Duplicate request detected: ${key}`);
  }

  // Check Redis (for distributed deduplication)
  const isRedisDuplicate = await checkRedisDuplicate(key, opts.prefix);
  if (isRedisDuplicate) {
    logger.debug({ key }, 'Deduplication hit (Redis)');
    metrics.increment(metricNames.DEDUPLICATION_HIT, 1, { source: 'redis' });
    opts.onDuplicate?.();
    throw new DeduplicationError(`Duplicate request detected: ${key}`);
  }

  // Mark as in-progress
  memoryStore.set(fullKey);
  await setRedisKey(key, opts.windowMs, opts.prefix);

  try {
    const result = await fn();

    // Cache the result
    memoryStore.set(fullKey, result);

    return {
      isFirst: true,
      result,
      key,
    };
  } catch (error) {
    // Remove marker on error so retries can work
    memoryStore.delete(fullKey);
    throw error;
  }
}

/**
 * Deduplication error
 */
export class DeduplicationError extends Error {
  dedupKey: string;

  constructor(message: string, key?: string) {
    super(message);
    this.name = 'DeduplicationError';
    this.dedupKey = key || '';
  }
}

/**
 * Get deduplication stats
 */
export function getDeduplicationStats(): {
  memoryKeys: number;
} {
  return {
    memoryKeys: memoryStore.size,
  };
}

/**
 * Cleanup deduplication store
 */
export function cleanupDeduplication(): void {
  memoryStore.cleanup();
}

/**
 * Clear all deduplication data
 */
export function clearDeduplication(): void {
  memoryStore.clear();
}

/**
 * Middleware for deduplication
 */
export function withDeduplicationMiddleware(
  handler: (req: Request) => Promise<Response>,
  keyExtractor: (req: Request) => string
) {
  return async (req: Request): Promise<Response> => {
    const key = keyExtractor(req);

    try {
      const result = await withDeduplication(key, () => handler(req));
      return result.result;
    } catch (error) {
      if (error instanceof DeduplicationError) {
        return new Response(
          JSON.stringify({ error: 'Duplicate request' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    }
  };
}
