import { NextRequest, NextResponse } from 'next/server';
import { metrics, metricNames } from './metrics';
import { cache } from './cache';
import { logger } from './error-logger';
import crypto from 'crypto';

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a unique span ID
 */
export function generateSpanId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Extract trace context from request headers
 */
export function extractTraceContext(req: NextRequest): TraceContext {
  const traceId = req.headers.get('x-trace-id') || generateTraceId();
  const spanId = req.headers.get('x-span-id') || generateSpanId();
  const parentSpanId = req.headers.get('x-parent-span-id') || undefined;

  return { traceId, spanId, parentSpanId };
}

/**
 * Add trace headers to response
 */
export function addTraceHeaders(res: NextResponse, context: TraceContext): NextResponse {
  res.headers.set('x-trace-id', context.traceId);
  res.headers.set('x-span-id', context.spanId);
  return res;
}

/**
 * Add standard API headers to response
 */
export function addApiHeaders(res: NextResponse, version: string = '1.0.0'): NextResponse {
  res.headers.set('x-api-version', version);
  res.headers.set('x-request-id', generateTraceId());
  return res;
}

/**
 * Observability middleware for API routes
 */
export async function withObservability(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = performance.now();
  const traceContext = extractTraceContext(req);
  const method = req.method;
  const pathname = req.nextUrl.pathname;

  // Add metrics
  metrics.increment(metricNames.API_REQUESTS, 1, { method, pathname });

  try {
    const res = await handler(req);
    const duration = performance.now() - startTime;

    // Add observability headers
    addTraceHeaders(res, traceContext);
    addApiHeaders(res);

    // Record duration
    metrics.observe(metricNames.API_DURATION, duration, { method, pathname });

    // Log slow requests
    if (duration > 1000) {
      logger.warn({ method, pathname, duration, traceId: traceContext.traceId }, 'Slow API request');
    }

    // Log request
    logger.info({
      method,
      pathname,
      status: res.status,
      duration,
      traceId: traceContext.traceId,
    }, 'API request completed');

    return res;
  } catch (err) {
    const duration = performance.now() - startTime;
    metrics.increment(metricNames.API_ERRORS, 1, { method, pathname });

    logger.error({
      err,
      method,
      pathname,
      duration,
      traceId: traceContext.traceId,
    }, 'API request failed');

    throw err;
  }
}

/**
 * Cache wrapper for API responses
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    metrics.increment(metricNames.CACHE_HITS, 1, { key });
    return cached;
  }

  // Fetch fresh data
  metrics.increment(metricNames.CACHE_MISSES, 1, { key });
  const data = await fetcher();

  // Store in cache
  await cache.set(key, data, { redisTTL: ttl });

  return data;
}
