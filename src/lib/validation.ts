import { z, ZodSchema } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from './error-logger';

type RequestType = 'body' | 'query' | 'params';

interface ValidateOptions<T> {
  schema: ZodSchema<T>;
  source: RequestType;
}

/**
 * Validate request data against a Zod schema
 */
export async function validate<T>(
  req: NextRequest,
  options: ValidateOptions<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  const { schema, source } = options;

  try {
    let data: unknown;

    switch (source) {
      case 'body':
        data = await req.json();
        break;
      case 'query': {
        const { searchParams } = new URL(req.url);
        data = Object.fromEntries(searchParams.entries());
        break;
      }
      case 'params': {
        // For route params, we need to extract them differently
        // This is typically handled in the route handler
        data = {};
        break;
      }
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      logger.warn({ errors: result.error.flatten(), source }, 'Validation failed');
      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: result.error.flatten(),
          },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (err) {
    logger.error({ err, source }, 'Validation error');
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Invalid request data' },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  return validate(req, { schema, source: 'body' });
}

/**
 * Validate query parameters against a Zod schema
 */
export async function validateQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  return validate(req, { schema, source: 'query' });
}

/**
 * Sanitize string input (strip HTML, trim whitespace)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[char] || char;
    })
    .trim();
}

/**
 * Sanitize object (recursively sanitize all string values)
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return sanitized;
}
