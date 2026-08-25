import { type RateLimitResult, applyRateLimitHeaders } from './rate-limit';

/**
 * Standard API response builder.
 * Ensures every response includes rate limit headers and consistent JSON shape.
 */
export function apiSuccess(
  data: unknown,
  meta?: Record<string, unknown>,
  rateLimit?: RateLimitResult,
  status = 200,
): Response {
  const body = JSON.stringify({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });

  let response = new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  if (rateLimit) {
    response = applyRateLimitHeaders(response, rateLimit);
  }

  return response;
}

export function apiError(
  message: string,
  status = 400,
  details?: Record<string, unknown>,
  rateLimit?: RateLimitResult,
): Response {
  const body = JSON.stringify({
    success: false,
    error: message,
    ...(details ? { details } : {}),
  });

  let response = new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

  if (rateLimit) {
    response = applyRateLimitHeaders(response, rateLimit);
  }

  return response;
}

export function apiUnauthorized(rateLimit?: RateLimitResult): Response {
  return apiError('Authentication required', 401, undefined, rateLimit);
}

export function apiForbidden(message = 'Insufficient permissions', rateLimit?: RateLimitResult): Response {
  return apiError(message, 403, undefined, rateLimit);
}

export function apiNotFound(resource = 'Resource', rateLimit?: RateLimitResult): Response {
  return apiError(`${resource} not found`, 404, undefined, rateLimit);
}

export function apiInternal(rateLimit?: RateLimitResult): Response {
  return apiError('Internal server error', 500, undefined, rateLimit);
}
