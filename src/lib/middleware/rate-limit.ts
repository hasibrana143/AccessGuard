import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

const PLAN_LIMITS: Record<string, { requests: number; windowMs: number }> = {
  free: { requests: 60, windowMs: 60000 },
  starter: { requests: 120, windowMs: 60000 },
  growth: { requests: 300, windowMs: 60000 },
  agency: { requests: 600, windowMs: 60000 },
  enterprise: { requests: 1200, windowMs: 60000 },
};

export function rateLimit(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = config.keyGenerator
      ? config.keyGenerator(req)
      : getDefaultKey(req);

    const entry = rateLimitStore.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return null;
    }

    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: `Too many requests. Retry after ${retryAfter}s.`,
          retryAfter,
          limit: config.maxRequests,
          remaining: 0,
          reset: new Date(entry.resetTime).toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetTime / 1000)),
          },
        }
      );
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    return null;
  };
}

export function planRateLimit() {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const orgId = req.headers.get('x-org-id');
    if (!orgId) return null;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!org) return null;

    const limits = PLAN_LIMITS[org.plan] || PLAN_LIMITS.free;
    return rateLimit({
      windowMs: limits.windowMs,
      maxRequests: limits.requests,
      keyGenerator: (r) => {
        const authHeader = r.headers.get('authorization');
        const apiKey = authHeader?.replace('Bearer ', '') || 'anonymous';
        return `plan:${orgId}:${apiKey}`;
      },
    })(req);
  };
}

function getDefaultKey(req: NextRequest): string {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  if (apiKey) return `api:${apiKey}`;

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

export function apiRateLimit() {
  return rateLimit({
    windowMs: 60000,
    maxRequests: 60,
  });
}

export function scanRateLimit() {
  return rateLimit({
    windowMs: 3600000,
    maxRequests: 100,
    keyGenerator: (req) => {
      const authHeader = req.headers.get('authorization');
      const apiKey = authHeader?.replace('Bearer ', '') || 'unknown';
      return `scan:${apiKey}`;
    },
  });
}

export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
  return response;
}
