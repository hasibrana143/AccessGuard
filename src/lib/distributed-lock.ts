/**
 * Distributed Lock Manager
 * 
 * Prevents concurrent operations on shared resources (scans, reports, etc.)
 * Uses Redis for distributed locking with automatic expiry.
 * 
 * Features:
 * - Redis-based distributed locks
 * - Automatic expiry (TTL)
 * - Retry with exponential backoff
 * - Lock extension
 * - Fallback to in-memory locks
 * 
 * Usage:
 *   import { withLock } from '@/lib/distributed-lock';
 *   
 *   await withLock('scan:project-123', async () => {
 *     // Only one scan at a time per project
 *     await runScan(projectId);
 *   });
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import { getRedis } from './redis';
import crypto from 'crypto';

export interface LockOptions {
  ttl: number;              // Lock TTL in ms
  retryDelay: number;       // Delay between retries
  maxRetries: number;       // Maximum retry attempts
  retryBackoff: number;     // Backoff multiplier
}

export interface LockInfo {
  key: string;
  value: string;
  acquiredAt: Date;
  expiresAt: Date;
  owner: string;
}

const DEFAULT_OPTIONS: LockOptions = {
  ttl: 30000,              // 30 seconds
  retryDelay: 100,
  maxRetries: 10,
  retryBackoff: 1.5,
};

// Generate unique owner ID for this process
const OWNER_ID = `process:${process.pid}:${crypto.randomUUID().slice(0, 8)}`;

/**
 * Try to acquire a lock using Redis
 */
async function tryAcquireLock(
  key: string,
  value: string,
  ttl: number
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const result = await redis.set(
      `lock:${key}`,
      value,
      'PX',
      ttl,
      'NX'
    );
    return result === 'OK';
  } catch (error) {
    logger.error({ key, error: error instanceof Error ? error.message : 'Unknown' }, 
      'Redis lock acquisition failed');
    return false;
  }
}

/**
 * Release a lock using Redis
 */
async function releaseLock(key: string, value: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    // Lua script to ensure we only release our own lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await redis.eval(script, 1, `lock:${key}`, value);
    return result === 1;
  } catch (error) {
    logger.error({ key, error: error instanceof Error ? error.message : 'Unknown' },
      'Redis lock release failed');
    return false;
  }
}

/**
 * Extend a lock TTL using Redis
 */
async function extendLock(key: string, value: string, ttl: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;
    const result = await redis.eval(script, 1, `lock:${key}`, value, String(ttl));
    return result === 1;
  } catch (error) {
    logger.error({ key, error: error instanceof Error ? error.message : 'Unknown' },
      'Redis lock extension failed');
    return false;
  }
}

/**
 * In-memory lock fallback for single-process scenarios
 */
class InMemoryLockManager {
  private locks = new Map<string, { value: string; expiresAt: number }>();

  tryAcquire(key: string, value: string, ttl: number): boolean {
    const lock = this.locks.get(key);
    
    // Check if lock exists and is not expired
    if (lock && lock.expiresAt > Date.now()) {
      return false;
    }

    this.locks.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });

    return true;
  }

  release(key: string, value: string): boolean {
    const lock = this.locks.get(key);
    
    if (!lock || lock.value !== value) {
      return false;
    }

    this.locks.delete(key);
    return true;
  }

  extend(key: string, value: string, ttl: number): boolean {
    const lock = this.locks.get(key);
    
    if (!lock || lock.value !== value) {
      return false;
    }

    lock.expiresAt = Date.now() + ttl;
    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, lock] of this.locks) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
      }
    }
  }

  getStats(): { total: number; active: number } {
    const now = Date.now();
    let active = 0;
    for (const lock of this.locks.values()) {
      if (lock.expiresAt > now) active++;
    }
    return { total: this.locks.size, active };
  }
}

const inMemoryLocks = new InMemoryLockManager();

// Cleanup expired in-memory locks periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => inMemoryLocks.cleanup(), 10000);
}

/**
 * Acquire a distributed lock
 */
export async function acquireLock(
  key: string,
  options?: Partial<LockOptions>
): Promise<LockInfo | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const value = `${OWNER_ID}:${crypto.randomUUID()}`;

  // Try to acquire lock
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    // Try Redis first
    let acquired = await tryAcquireLock(key, value, opts.ttl);
    
    // Fallback to in-memory if Redis not available
    if (!acquired && !getRedis()) {
      acquired = inMemoryLocks.tryAcquire(key, value, opts.ttl);
    }

    if (acquired) {
      metrics.increment(metricNames.LOCK_ACQUIRED, 1, { key });
      
      logger.debug({ key, attempt }, 'Lock acquired');
      
      return {
        key,
        value,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + opts.ttl),
        owner: OWNER_ID,
      };
    }

    // Wait before retry
    if (attempt < opts.maxRetries) {
      const delay = opts.retryDelay * Math.pow(opts.retryBackoff, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  metrics.increment(metricNames.LOCK_FAILED, 1, { key });
  logger.warn({ key, maxRetries: opts.maxRetries }, 'Failed to acquire lock');
  
  return null;
}

/**
 * Release a distributed lock
 */
export async function releaseLockById(key: string, value: string): Promise<boolean> {
  // Try Redis first
  const released = await releaseLock(key, value);
  
  // Fallback to in-memory
  if (!released && !getRedis()) {
    return inMemoryLocks.release(key, value);
  }

  if (released) {
    logger.debug({ key }, 'Lock released');
  }

  return released;
}

/**
 * Extend a distributed lock TTL
 */
export async function extendLockById(
  key: string,
  value: string,
  ttl: number
): Promise<boolean> {
  // Try Redis first
  const extended = await extendLock(key, value, ttl);
  
  // Fallback to in-memory
  if (!extended && !getRedis()) {
    return inMemoryLocks.extend(key, value, ttl);
  }

  return extended;
}

/**
 * Execute function with a distributed lock
 * Automatically acquires and releases lock
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options?: Partial<LockOptions>
): Promise<T> {
  const lock = await acquireLock(key, options);
  
  if (!lock) {
    throw new LockError(`Failed to acquire lock: ${key}`);
  }

  // Setup auto-extension
  const extensionInterval = setInterval(async () => {
    await extendLockById(key, lock.value, options?.ttl || DEFAULT_OPTIONS.ttl);
  }, (options?.ttl || DEFAULT_OPTIONS.ttl) / 3);

  try {
    const result = await fn();
    return result;
  } finally {
    clearInterval(extensionInterval);
    await releaseLockById(key, lock.value);
  }
}

/**
 * Lock error
 */
export class LockError extends Error {
  lockKey: string;

  constructor(message: string, key?: string) {
    super(message);
    this.name = 'LockError';
    this.lockKey = key || '';
  }
}

/**
 * Get lock stats
 */
export function getLockStats(): {
  inMemory: { total: number; active: number };
  owner: string;
} {
  return {
    inMemory: inMemoryLocks.getStats(),
    owner: OWNER_ID,
  };
}

/**
 * Common lock keys
 */
export const LockKeys = {
  scan: (projectId: string) => `scan:${projectId}`,
  report: (reportId: string) => `report:${reportId}`,
  email: (userId: string) => `email:${userId}`,
  webhook: (webhookId: string) => `webhook:${webhookId}`,
  deploy: (projectId: string) => `deploy:${projectId}`,
} as const;
