import { NextResponse } from 'next/server';

// Security headers to apply to all responses
export const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  // Strict Transport Security (HSTS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

// Apply security headers to a response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

// CORS configuration
export const corsConfig = {
  // Allowed origins (configure based on environment)
  allowedOrigins: [
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[],
  // Allowed methods
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-Id',
  ],
  // Exposed headers
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  // Allow credentials
  credentials: true,
  // Max age for preflight cache
  maxAge: 86400, // 24 hours
};

// Handle CORS for API routes
export function handleCors(
  request: Request,
  response: NextResponse
): NextResponse {
  const origin = request.headers.get('origin');

  // Check if origin is allowed
  if (origin && corsConfig.allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      corsConfig.allowedMethods.join(', ')
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      corsConfig.allowedHeaders.join(', ')
    );
    response.headers.set(
      'Access-Control-Expose-Headers',
      corsConfig.exposedHeaders.join(', ')
    );
    response.headers.set(
      'Access-Control-Max-Age',
      String(corsConfig.maxAge)
    );
  }

  return response;
}

// Create a secure response with all security headers
export function secureResponse(data: unknown, status = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  return applySecurityHeaders(response);
}

// Create an error response with security headers
export function errorResponse(
  message: string,
  status = 500,
  details?: unknown
): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: message,
      ...(details && { details }),
    },
    { status }
  );
  return applySecurityHeaders(response);
}
