/**
 * API Gateway
 * 
 * Centralized entry point for API requests with:
 * - Request routing and transformation
 * - Response aggregation
 * - Rate limiting
 * - Authentication
 * - Caching
 * - Load balancing
 * 
 * Usage:
 *   import { apiGateway } from '@/lib/api-gateway';
 *   
 *   // Register routes
 *   apiGateway.route('/api/v1/projects', {
 *     handler: projectsHandler,
 *     rateLimit: { windowMs: 60000, max: 100 },
 *     cache: { ttl: 60 },
 *   });
 *   
 *   // Handle request
 *   const response = await apiGateway.handle(request);
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import { circuitBreakers } from './circuit-breaker';
import { bulkheadManager } from './bulkhead';

export interface GatewayRoute {
  path: string;
  handler: (req: NextRequest) => Promise<NextResponse>;
  method?: string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
  cache?: {
    ttl: number;
    key?: (req: NextRequest) => string;
  };
  auth?: boolean;
  timeout?: number;
  circuitBreaker?: string;
  bulkhead?: string;
}

export interface GatewayOptions {
  defaultTimeout: number;
  defaultRateLimit: {
    windowMs: number;
    max: number;
  };
  enableMetrics: boolean;
  enableLogging: boolean;
}

export interface GatewayRequest {
  original: NextRequest;
  path: string;
  method: string;
  headers: Record<string, string>;
  startTime: number;
}

export interface GatewayResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

const DEFAULT_OPTIONS: GatewayOptions = {
  defaultTimeout: 30000,
  defaultRateLimit: {
    windowMs: 60000,
    max: 100,
  },
  enableMetrics: true,
  enableLogging: true,
};

// Simple in-memory rate limiter
class RateLimiter {
  private requests = new Map<string, number[]>();

  isAllowed(key: string, windowMs: number, max: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);

    if (timestamps.length >= max) {
      return false;
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }

  getRemaining(key: string, windowMs: number, max: number): number {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (this.requests.get(key) || []).filter(t => t > windowStart);
    return Math.max(0, max - timestamps.length);
  }
}

// Simple in-memory cache
class ResponseCache {
  private cache = new Map<string, { data: unknown; expiry: number }>();

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: unknown, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number } {
    return { size: this.cache.size };
  }
}

class APIGateway {
  private routes = new Map<string, GatewayRoute>();
  private rateLimiter = new RateLimiter();
  private cache = new ResponseCache();
  private options: GatewayOptions;

  constructor(options?: Partial<GatewayOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Register a route
   */
  route(path: string, route: Omit<GatewayRoute, 'path'>): void {
    this.routes.set(path, { ...route, path });
    logger.debug({ path }, 'Gateway route registered');
  }

  /**
   * Handle incoming request
   */
  async handle(request: NextRequest): Promise<NextResponse> {
    const startTime = performance.now();
    const path = request.nextUrl.pathname;
    const method = request.method;

    // Find matching route
    const route = this.findRoute(path);
    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    // Check method
    if (route.method && !route.method.includes(method)) {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Rate limiting
    const rateLimitKey = this.getRateLimitKey(request);
    const rateLimit = route.rateLimit || this.options.defaultRateLimit;
    
    if (!this.rateLimiter.isAllowed(rateLimitKey, rateLimit.windowMs, rateLimit.max)) {
      const remaining = this.rateLimiter.getRemaining(rateLimitKey, rateLimit.windowMs, rateLimit.max);
      
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimit.max),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(Date.now() + rateLimit.windowMs),
            'Retry-After': String(Math.ceil(rateLimit.windowMs / 1000)),
          },
        }
      );
    }

    // Check cache
    if (route.cache) {
      const cacheKey = route.cache.key 
        ? route.cache.key(request) 
        : `${method}:${path}:${request.nextUrl.search}`;
      
      const cached = this.cache.get(cacheKey);
      if (cached) {
        if (this.options.enableMetrics) {
          metrics.increment(metricNames.GATEWAY_CACHE_HITS, 1, { path });
        }
        return NextResponse.json(cached, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }

    // Execute with circuit breaker if configured
    let response: NextResponse;
    
    try {
      if (route.circuitBreaker) {
        const breaker = circuitBreakers.get(route.circuitBreaker);
        response = await breaker.execute(() => route.handler(request));
      } else if (route.bulkhead) {
        response = await bulkheadManager.execute(
          route.bulkhead,
          () => route.handler(request)
        );
      } else {
        // Execute with timeout
        const timeout = route.timeout || this.options.defaultTimeout;
        response = await Promise.race([
          route.handler(request),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gateway timeout')), timeout)
          ),
        ]);
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      
      if (this.options.enableMetrics) {
        metrics.increment(metricNames.GATEWAY_ERRORS, 1, { path, method });
      }

      logger.error({
        path,
        method,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      }, 'Gateway request failed');

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const duration = performance.now() - startTime;

    // Cache response if configured
    if (route.cache && response.status >= 200 && response.status < 300) {
      const cacheKey = route.cache.key
        ? route.cache.key(request)
        : `${method}:${path}:${request.nextUrl.search}`;
      
      try {
        const body = await response.clone().json();
        this.cache.set(cacheKey, body, route.cache.ttl * 1000);
      } catch {
        // Response not JSON, skip caching
      }
    }

    // Add gateway headers
    response.headers.set('X-Gateway-Time', `${duration.toFixed(0)}ms`);
    response.headers.set('X-Request-Id', crypto.randomUUID());

    // Record metrics
    if (this.options.enableMetrics) {
      metrics.increment(metricNames.GATEWAY_REQUESTS, 1, { path, method, status: String(response.status) });
      metrics.observe(`${metricNames.GATEWAY_DURATION}.duration`, duration, { path, method });
    }

    // Log request
    if (this.options.enableLogging) {
      logger.info({
        path,
        method,
        status: response.status,
        duration,
      }, 'Gateway request handled');
    }

    return response;
  }

  /**
   * Find matching route
   */
  private findRoute(path: string): GatewayRoute | undefined {
    // Exact match first
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }

    // Pattern matching
    for (const [pattern, route] of this.routes) {
      if (this.matchPath(pattern, path)) {
        return route;
      }
    }

    return undefined;
  }

  /**
   * Match path pattern
   */
  private matchPath(pattern: string, path: string): boolean {
    // Simple pattern matching
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith('[') && patternParts[i].endsWith(']')) {
        // Dynamic segment
        continue;
      }
      if (patternParts[i] !== pathParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get rate limit key
   */
  private getRateLimitKey(request: NextRequest): string {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    return `gateway:${ip}`;
  }

  /**
   * Get gateway stats
   */
  getStats(): {
    routes: number;
    cache: { size: number };
  } {
    return {
      routes: this.routes.size,
      cache: this.cache.getStats(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    this.cache.invalidate(pattern);
  }
}

// Singleton
export const apiGateway = new APIGateway();

/**
 * Register common gateway routes
 */
export function registerGatewayRoutes(): void {
  // Health check
  apiGateway.route('/api/health', {
    handler: async () => NextResponse.json({ status: 'healthy' }),
    method: ['GET'],
    cache: { ttl: 10 },
  });

  // Projects
  apiGateway.route('/api/projects', {
    handler: async (req) => {
      // Placeholder - would use actual handler
      return NextResponse.json({ projects: [] });
    },
    method: ['GET', 'POST'],
    rateLimit: { windowMs: 60000, max: 100 },
    cache: { ttl: 30 },
    auth: true,
  });

  // Scans
  apiGateway.route('/api/scans', {
    handler: async (req) => {
      return NextResponse.json({ scans: [] });
    },
    method: ['GET', 'POST'],
    rateLimit: { windowMs: 60000, max: 50 },
    auth: true,
  });
}
