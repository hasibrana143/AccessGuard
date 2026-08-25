import { NextResponse } from 'next/server';

interface ApiResponseMeta {
  timestamp: string;
  requestId?: string;
  version?: string;
}

interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  page: number;
  totalPages: number;
}

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiResponseMeta;
  pagination?: PaginationMeta;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
  meta: ApiResponseMeta;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

// Response builder
export class ApiResponseBuilder {
  private requestId?: string;
  private version?: string;

  setRequestId(id: string): this {
    this.requestId = id;
    return this;
  }

  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  private getMeta(): ApiResponseMeta {
    return {
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      version: this.version,
    };
  }

  // Success responses
  success<T>(data: T, status: number = 200): NextResponse<SuccessResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        meta: this.getMeta(),
      },
      { status }
    );
  }

  created<T>(data: T): NextResponse<SuccessResponse<T>> {
    return this.success(data, 201);
  }

  paginated<T>(
    data: T[],
    total: number,
    limit: number,
    offset: number
  ): NextResponse<SuccessResponse<T[]>> {
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        data,
        meta: this.getMeta(),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
          page,
          totalPages,
        },
      },
      { status: 200 }
    );
  }

  // Error responses
  error(message: string, status: number = 400, code?: string): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: message,
        code: code || this.getErrorCode(status),
        meta: this.getMeta(),
      },
      { status }
    );
  }

  badRequest(message: string, details?: Record<string, unknown>): NextResponse<ErrorResponse> {
    return this.error(message, 400, 'BAD_REQUEST');
  }

  unauthorized(message: string = 'Authentication required'): NextResponse<ErrorResponse> {
    return this.error(message, 401, 'UNAUTHORIZED');
  }

  forbidden(message: string = 'Insufficient permissions'): NextResponse<ErrorResponse> {
    return this.error(message, 403, 'FORBIDDEN');
  }

  notFound(message: string = 'Resource not found'): NextResponse<ErrorResponse> {
    return this.error(message, 404, 'NOT_FOUND');
  }

  conflict(message: string): NextResponse<ErrorResponse> {
    return this.error(message, 409, 'CONFLICT');
  }

  validationError(errors: ValidationErrorDetail[]): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { errors },
        meta: this.getMeta(),
      },
      { status: 422 }
    );
  }

  rateLimited(retryAfter: number): NextResponse<ErrorResponse> {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        details: { retryAfter },
        meta: this.getMeta(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  internalError(message: string = 'Internal server error'): NextResponse<ErrorResponse> {
    return this.error(message, 500, 'INTERNAL_ERROR');
  }

  serviceUnavailable(message: string = 'Service temporarily unavailable'): NextResponse<ErrorResponse> {
    return this.error(message, 503, 'SERVICE_UNAVAILABLE');
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }
}

// Singleton instance
export const apiResponse = new ApiResponseBuilder();

// Helper functions
export function success<T>(data: T, status?: number) {
  return apiResponse.success(data, status);
}

export function created<T>(data: T) {
  return apiResponse.created(data);
}

export function paginated<T>(data: T[], total: number, limit: number, offset: number) {
  return apiResponse.paginated(data, total, limit, offset);
}

export function error(message: string, status?: number, code?: string) {
  return apiResponse.error(message, status, code);
}

export function badRequest(message: string) {
  return apiResponse.badRequest(message);
}

export function unauthorized(message?: string) {
  return apiResponse.unauthorized(message);
}

export function forbidden(message?: string) {
  return apiResponse.forbidden(message);
}

export function notFound(message?: string) {
  return apiResponse.notFound(message);
}

export function conflict(message: string) {
  return apiResponse.conflict(message);
}

export function validationError(errors: ValidationErrorDetail[]) {
  return apiResponse.validationError(errors);
}

export function rateLimited(retryAfter: number) {
  return apiResponse.rateLimited(retryAfter);
}

export function internalError(message?: string) {
  return apiResponse.internalError(message);
}

export function serviceUnavailable(message?: string) {
  return apiResponse.serviceUnavailable(message);
}
