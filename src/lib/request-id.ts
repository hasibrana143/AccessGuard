import { randomUUID } from 'crypto';

/**
 * Generate or extract a request ID for tracing.
 * Client can send X-Request-ID header; otherwise we generate one.
 */
export function getRequestId(request?: Request): string {
  if (request) {
    const clientRequestId = request.headers.get('x-request-id');
    if (clientRequestId && clientRequestId.length <= 128) {
      return clientRequestId;
    }
  }
  return randomUUID();
}

/**
 * Add X-Request-ID header to a Response.
 */
export function withRequestId(response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Request-ID', requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
