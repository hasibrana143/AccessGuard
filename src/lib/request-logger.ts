import { NextRequest, NextResponse } from 'next/server';
import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import crypto from 'crypto';

interface RequestLog {
  requestId: string;
  method: string;
  path: string;
  query: string;
  ip: string;
  userAgent: string;
  userId?: string;
  orgId?: string;
  startTime: number;
}

interface ResponseLog extends RequestLog {
  statusCode: number;
  duration: number;
  contentLength?: number;
}

// Sensitive fields to redact
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apiKey',
  'creditCard',
  'ssn',
];

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Extract client IP from request
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Redact sensitive data from object
 */
function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...obj };
  
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitive(redacted[key] as Record<string, unknown>);
    }
  }
  
  return redacted;
}

/**
 * Sanitize path (remove query params, hash)
 */
function sanitizePath(pathname: string): string {
  return pathname.split('?')[0].split('#')[0];
}

/**
 * Request logging middleware
 */
export async function withRequestLogging(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  const pathname = sanitizePath(req.nextUrl.pathname);

  // Build request log
  const requestLog: RequestLog = {
    requestId,
    method: req.method,
    path: pathname,
    query: req.nextUrl.search,
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent') || 'unknown',
    startTime,
  };

  // Add request ID to headers
  req.headers.set('x-request-id', requestId);

  // Log incoming request
  logger.info({
    ...requestLog,
    type: 'request',
  }, `→ ${req.method} ${pathname}`);

  try {
    const res = await handler(req);
    const duration = performance.now() - startTime;

    // Build response log
    const responseLog: ResponseLog = {
      ...requestLog,
      statusCode: res.status,
      duration,
      contentLength: parseInt(res.headers.get('content-length') || '0', 10),
    };

    // Log response
    const logLevel = res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info';
    logger[logLevel]({
      ...responseLog,
      type: 'response',
    }, `← ${req.method} ${pathname} ${res.status} (${duration.toFixed(0)}ms)`);

    // Record metrics
    metrics.observe(metricNames.API_DURATION, duration, {
      method: req.method,
      path: pathname,
      status: String(res.status),
    });

    // Add response headers
    res.headers.set('x-request-id', requestId);
    res.headers.set('x-response-time', `${duration.toFixed(0)}ms`);

    return res;
  } catch (err) {
    const duration = performance.now() - startTime;

    // Log error
    logger.error({
      ...requestLog,
      statusCode: 500,
      duration,
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      type: 'error',
    }, `← ${req.method} ${pathname} 500 (${duration.toFixed(0)}ms)`);

    // Record error metrics
    metrics.increment(metricNames.API_ERRORS, 1, {
      method: req.method,
      path: pathname,
    });

    throw err;
  }
}

/**
 * Extract user context from request
 */
export function extractUserContext(req: NextRequest): { userId?: string; orgId?: string } {
  // This would typically extract from JWT or session
  // For now, return empty
  return {};
}

/**
 * Log audit event
 */
export function logAuditEvent(
  action: string,
  userId: string,
  orgId: string,
  metadata: Record<string, unknown>
): void {
  logger.info({
    type: 'audit',
    action,
    userId,
    orgId,
    metadata: redactSensitive(metadata),
    timestamp: new Date().toISOString(),
  }, `Audit: ${action}`);
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  req: NextRequest,
  details?: Record<string, unknown>
): void {
  logger.warn({
    type: 'security',
    event,
    ip: getClientIp(req),
    path: req.nextUrl.pathname,
    userAgent: req.headers.get('user-agent'),
    details: details ? redactSensitive(details) : undefined,
    timestamp: new Date().toISOString(),
  }, `Security: ${event}`);
}
