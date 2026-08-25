import { getRedis, isRedisReady } from './redis';
import { logger } from './error-logger';
import { metrics } from './metrics';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  total: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Predefined rate limits
export const RATE_LIMITS = {
  // General API
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'rl:default',
  },
  
  // Authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyPrefix: 'rl:auth',
  },
  
  // Scan operations
  scan: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'rl:scan',
  },
  
  // Email sending
  email: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    keyPrefix: 'rl:email',
  },
  
  // Webhook calls
  webhook: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    keyPrefix: 'rl:webhook',
  },
  
  // Heavy operations (reports, exports)
  heavy: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyPrefix: 'rl:heavy',
  },
} as const;

class RateLimiter {
  private inMemoryStore = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.inMemoryStore.entries()) {
      if (entry.resetTime < now) {
        this.inMemoryStore.delete(key);
      }
    }
  }

  /**
   * Check rate limit using sliding window counter
   */
  async check(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `${config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Try Redis first
    if (isRedisReady()) {
      try {
        return await this.checkRedis(key, config, now, windowStart);
      } catch (err) {
        logger.error({ err, key }, 'Redis rate limit check failed, falling back to memory');
      }
    }

    // Fallback to in-memory
    return this.checkMemory(key, config, now, windowStart);
  }

  private async checkRedis(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult> {
    const redis = getRedis();
    if (!redis) throw new Error('Redis not available');

    const pipeline = redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Count requests in window
    pipeline.zcard(key);
    
    // Set expiry
    pipeline.pexpire(key, config.windowMs);
    
    const results = await pipeline.exec();
    
    if (!results) throw new Error('Pipeline execution failed');
    
    const count = results[2][1] as number;
    const remaining = Math.max(0, config.maxRequests - count);
    const reset = Math.ceil((now + config.windowMs) / 1000);

    metrics.increment('rate_limit.checks', 1, { allowed: String(remaining > 0) });

    return {
      allowed: remaining > 0,
      remaining,
      reset,
      total: config.maxRequests,
    };
  }

  private checkMemory(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): RateLimitResult {
    const entry = this.inMemoryStore.get(key);

    if (!entry || entry.resetTime < windowStart) {
      // New window
      this.inMemoryStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        reset: Math.ceil((now + config.windowMs) / 1000),
        total: config.maxRequests,
      };
    }

    // Existing window
    entry.count++;

    return {
      allowed: entry.count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      reset: Math.ceil(entry.resetTime / 1000),
      total: config.maxRequests,
    };
  }

  /**
   * Get rate limit headers
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': String(result.total),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.reset),
      'X-RateLimit-Policy': `${result.total};w=${Math.ceil(result.reset - Date.now() / 1000)}`,
    };
  }

  /**
   * Create rate limit response
   */
  createResponse(result: RateLimitResult): Response {
    const headers = this.getHeaders(result);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: result.reset - Math.floor(Date.now() / 1000),
      }),
      {
        status: 429,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Retry-After': String(result.reset - Math.floor(Date.now() / 1000)),
        },
      }
    );
  }

  /**
   * Destroy rate limiter
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Rate limit middleware
 */
export async function withRateLimit(
  req: Request,
  config: RateLimitConfig = RATE_LIMITS.default
): Promise<{ allowed: boolean; response?: Response }> {
  const identifier = getIdentifier(req);
  const result = await rateLimiter.check(identifier, config);

  if (!result.allowed) {
    logger.warn({
      identifier,
      path: new URL(req.url).pathname,
      remaining: result.remaining,
    }, 'Rate limit exceeded');

    return {
      allowed: false,
      response: rateLimiter.createResponse(result),
    };
  }

  return { allowed: true };
}

/**
 * Get client identifier for rate limiting
 */
function getIdentifier(req: Request): string {
  // Try to get user ID from auth header
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    return `user:${authHeader.slice(0, 20)}`;
  }

  // Fall back to IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return `ip:${forwarded.split(',')[0].trim()}`;
  }

  return 'ip:unknown';
}
