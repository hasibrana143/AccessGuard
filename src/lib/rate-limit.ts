import { getRedis, isRedisReady } from './redis';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore.entries()) {
    if (now > entry.resetTime) {
      inMemoryStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitConfig {
  interval: number;
  limit: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export const rateLimits = {
  default: { interval: 60000, limit: 100 },
  scan: { interval: 60000, limit: 10 },
  remediation: { interval: 60000, limit: 20 },
  projects: { interval: 60000, limit: 30 },
};

function checkInMemory(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = inMemoryStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    inMemoryStore.set(identifier, { count: 1, resetTime: now + config.interval });
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: now + config.interval };
  }

  if (entry.count >= config.limit) {
    return { success: false, limit: config.limit, remaining: 0, reset: entry.resetTime };
  }

  entry.count++;
  return { success: true, limit: config.limit, remaining: config.limit - entry.count, reset: entry.resetTime };
}

async function checkRedis(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) return checkInMemory(identifier, config);

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowMs = config.interval;

  try {
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, now - windowMs);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.expire(key, Math.ceil(windowMs / 1000));
    const results = await multi.exec();
    const count = results?.[2]?.[1] as number ?? 0;

    const remaining = Math.max(0, config.limit - count);
    const reset = now + windowMs;

    return {
      success: count <= config.limit,
      limit: config.limit,
      remaining,
      reset,
    };
  } catch (err) {
    return checkInMemory(identifier, config);
  }
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = rateLimits.default,
): Promise<RateLimitResult> {
  if (isRedisReady()) {
    return checkRedis(identifier, config);
  }
  return checkInMemory(identifier, config);
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');

  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;
  if (cfIp) return cfIp;

  return 'anonymous';
}

export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
      },
    }
  );
}
