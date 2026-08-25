import { getRedis, isRedisReady } from './redis';
import { logger } from './error-logger';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

interface CacheConfig {
  memoryTTL: number;  // In-memory TTL in ms
  redisTTL: number;   // Redis TTL in seconds
}

const DEFAULT_CONFIG: CacheConfig = {
  memoryTTL: 60000,   // 1 minute
  redisTTL: 300,      // 5 minutes
};

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor() {
    // Cleanup expired memory cache entries every minute
    setInterval(() => this.cleanupMemoryCache(), 60000);
  }

  private cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  async get<T>(key: string, config: Partial<CacheConfig> = {}): Promise<T | null> {
    const { memoryTTL = DEFAULT_CONFIG.memoryTTL } = config;

    // L1: Check memory cache
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry && memEntry.expiry > Date.now()) {
      this.stats.hits++;
      return memEntry.data;
    }

    // L2: Check Redis
    if (isRedisReady()) {
      try {
        const redis = getRedis();
        if (redis) {
          const redisData = await redis.get(key);
          if (redisData) {
            const parsed = JSON.parse(redisData) as T;
            // Populate memory cache
            this.memoryCache.set(key, {
              data: parsed,
              expiry: Date.now() + memoryTTL,
            });
            this.stats.hits++;
            return parsed;
          }
        }
      } catch (err) {
        logger.error({ err, key }, 'Redis get error');
      }
    }

    this.stats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, config: Partial<CacheConfig> = {}): Promise<void> {
    const { memoryTTL = DEFAULT_CONFIG.memoryTTL, redisTTL = DEFAULT_CONFIG.redisTTL } = config;

    // Set in memory cache
    this.memoryCache.set(key, {
      data: value,
      expiry: Date.now() + memoryTTL,
    });

    // Set in Redis
    if (isRedisReady()) {
      try {
        const redis = getRedis();
        if (redis) {
          await redis.setex(key, redisTTL, JSON.stringify(value));
        }
      } catch (err) {
        logger.error({ err, key }, 'Redis set error');
      }
    }

    this.stats.sets++;
  }

  async invalidate(pattern: string): Promise<void> {
    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear Redis
    if (isRedisReady()) {
      try {
        const redis = getRedis();
        if (redis) {
          const keys = await redis.keys(`${pattern}*`);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        }
      } catch (err) {
        logger.error({ err, pattern }, 'Redis invalidate error');
      }
    }

    this.stats.deletes++;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    return this.invalidate(pattern);
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      memorySize: this.memoryCache.size,
    };
  }

  async flush(): Promise<void> {
    this.memoryCache.clear();
    if (isRedisReady()) {
      try {
        const redis = getRedis();
        if (redis) {
          await redis.flushdb();
        }
      } catch (err) {
        logger.error({ err }, 'Redis flush error');
      }
    }
  }
}

export const cache = new CacheManager();

// Cache key generators
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  org: (id: string) => `org:${id}`,
  orgSettings: (id: string) => `org:${id}:settings`,
  project: (id: string) => `project:${id}`,
  projectStats: (id: string) => `project:${id}:stats`,
  violations: (orgId: string) => `violations:${orgId}`,
  scans: (orgId: string) => `scans:${orgId}`,
  dashboard: (orgId: string) => `dashboard:${orgId}`,
  featureFlags: () => 'feature-flags',
  session: (token: string) => `session:${token}`,
};

// Cache TTLs (in seconds)
export const cacheTTL = {
  short: 30,        // 30 seconds
  medium: 300,      // 5 minutes
  long: 3600,       // 1 hour
  day: 86400,       // 1 day
};
