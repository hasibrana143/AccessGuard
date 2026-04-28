// Custom error classes for better error handling

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', 429, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'RateLimitError';
  }
}

// Error handler for API routes
import { NextResponse } from 'next/server';

export function handleError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Check for Prisma errors
    if (error.message.includes('Prisma')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error occurred',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  );
}

// Async wrapper for API route handlers
export function asyncHandler<T>(
  handler: () => Promise<NextResponse<T>>
): () => Promise<NextResponse<T>> {
  return async () => {
    try {
      return await handler();
    } catch (error) {
      return handleError(error);
    }
  };
}
