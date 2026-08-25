/**
 * Idempotency Key System
 * 
 * Prevents duplicate operations by tracking processed requests.
 * Essential for payment processing, email sending, etc.
 * 
 * Features:
 * - Redis-backed idempotency keys
 * - Configurable TTL
 * - Response caching for duplicates
 * - Cleanup of expired keys
 * 
 * Usage:
 *   import { withIdempotency } from '@/lib/idempotency';
 *   
 *   const result = await withIdempotency('payment-123', async () => {
 *     return await processPayment(amount);
 *   });
 */

import { getRedis } from './redis';
import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import crypto from 'crypto';

export interface IdempotencyOptions {
  ttl: number;              // Key TTL in seconds
  prefix: string;           // Key prefix
  lockTimeout: number;      // Lock timeout in ms
}

export interface IdempotencyResult<T> {
  isFirstExecution: boolean;
  result: T;
  key: string;
}

export interface IdempotencyRecord {
  key: string;
  result: unknown;
  createdAt: string;
  expiresAt: string;
}

const DEFAULT_OPTIONS: IdempotencyOptions = {
  ttl: 86400,  // 24 hours
  prefix: 'idempotency',
  lockTimeout: 5000,
};

/**
 * Generate idempotency key from request
 */
export function generateIdempotencyKey(
  userId: string,
  operation: string,
  payload: Record<string, unknown>
): string {
  const data = `${userId}:${operation}:${JSON.stringify(payload)}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get idempotency record from Redis
 */
async function getRecord(key: string, prefix: string): Promise<IdempotencyRecord | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const fullKey = `${prefix}:${key}`;
    const data = await redis.get(fullKey);
    if (!data) return null;

    const record: IdempotencyRecord = JSON.parse(data);
    
    // Check if expired
    if (new Date(record.expiresAt) < new Date()) {
      await redis.del(fullKey);
      return null;
    }

    return record;
  } catch (error) {
    logger.error({ key, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to get idempotency record');
    return null;
  }
}

/**
 * Set idempotency record in Redis
 */
async function setRecord(
  key: string,
  result: unknown,
  ttl: number,
  prefix: string
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const fullKey = `${prefix}:${key}`;
    const record: IdempotencyRecord = {
      key,
      result,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };

    await redis.setex(fullKey, ttl, JSON.stringify(record));
    return true;
  } catch (error) {
    logger.error({ key, error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to set idempotency record');
    return false;
  }
}

/**
 * Acquire lock for idempotency key
 */
async function acquireLock(key: string, prefix: string, timeout: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // No Redis = no locking

  try {
    const lockKey = `${prefix}:lock:${key}`;
    const lockValue = crypto.randomUUID();
    
    const result = await redis.set(lockKey, lockValue, 'PX', timeout, 'NX');
    return result === 'OK';
  } catch {
    return false;
  }
}

/**
 * Release lock for idempotency key
 */
async function releaseLock(key: string, prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const lockKey = `${prefix}:lock:${key}`;
    await redis.del(lockKey);
  } catch {
    // Ignore lock release errors
  }
}

/**
 * Execute function with idempotency protection
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<T>,
  options?: Partial<IdempotencyOptions>
): Promise<IdempotencyResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check for existing record
  const existing = await getRecord(key, opts.prefix);
  if (existing) {
    logger.info({ key }, 'Idempotency hit - returning cached result');
    metrics.increment(metricNames.IDEMPOTENCY_HIT, 1);
    return {
      isFirstExecution: false,
      result: existing.result as T,
      key,
    };
  }

  // Acquire lock
  const lockAcquired = await acquireLock(key, opts.prefix, opts.lockTimeout);
  if (!lockAcquired) {
    // Another request is processing this key
    // Wait and check again
    await new Promise(resolve => setTimeout(resolve, 100));
    const retry = await getRecord(key, opts.prefix);
    if (retry) {
      return {
        isFirstExecution: false,
        result: retry.result as T,
        key,
      };
    }
    throw new Error('Idempotency lock timeout');
  }

  try {
    // Execute the function
    const result = await fn();

    // Store the result
    await setRecord(key, result, opts.ttl, opts.prefix);

    logger.info({ key }, 'Idempotency record stored');
    metrics.increment(metricNames.IDEMPOTENCY_MISS, 1);

    return {
      isFirstExecution: true,
      result,
      key,
    };
  } finally {
    await releaseLock(key, opts.prefix);
  }
}

/**
 * Cleanup expired idempotency keys
 */
export async function cleanupIdempotencyKeys(
  prefix: string = DEFAULT_OPTIONS.prefix
): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  try {
    const pattern = `${prefix}:*`;
    const keys = await redis.keys(pattern);
    
    let cleaned = 0;
    for (const key of keys) {
      // Skip lock keys
      if (key.includes(':lock:')) continue;

      const data = await redis.get(key);
      if (!data) {
        await redis.del(key);
        cleaned++;
        continue;
      }

      const record: IdempotencyRecord = JSON.parse(data);
      if (new Date(record.expiresAt) < new Date()) {
        await redis.del(key);
        cleaned++;
      }
    }

    logger.info({ cleaned, total: keys.length }, 'Idempotency keys cleaned up');
    return cleaned;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown' },
      'Failed to cleanup idempotency keys');
    return 0;
  }
}

/**
 * Get idempotency stats
 */
export async function getIdempotencyStats(
  prefix: string = DEFAULT_OPTIONS.prefix
): Promise<{
  totalKeys: number;
  expiredKeys: number;
  activeKeys: number;
}> {
  const redis = getRedis();
  if (!redis) return { totalKeys: 0, expiredKeys: 0, activeKeys: 0 };

  try {
    const pattern = `${prefix}:*`;
    const keys = await redis.keys(pattern);
    
    let expired = 0;
    let active = 0;

    for (const key of keys) {
      if (key.includes(':lock:')) continue;

      const data = await redis.get(key);
      if (!data) {
        expired++;
        continue;
      }

      const record: IdempotencyRecord = JSON.parse(data);
      if (new Date(record.expiresAt) < new Date()) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      totalKeys: keys.length,
      expiredKeys: expired,
      activeKeys: active,
    };
  } catch {
    return { totalKeys: 0, expiredKeys: 0, activeKeys: 0 };
  }
}
