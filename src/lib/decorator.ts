/**
 * Decorator Pattern
 * 
 * Adds cross-cutting concerns to functions without modifying them.
 * 
 * Features:
 * - Logging decorator
 * - Caching decorator
 * - Timing decorator
 * - Retry decorator
 * - Rate limiting decorator
 * - Validation decorator
 * 
 * Usage:
 *   import { withLogging, withCaching, withTiming } from '@/lib/decorator';
 *   
 *   const enhancedFn = withLogging(
 *     withCaching(
 *       withTiming(myFunction),
 *       { ttl: 60 }
 *     )
 *   );
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';

export type Decorator<TArgs extends unknown[], TReturn> = (
  fn: (...args: TArgs) => Promise<TReturn>
) => (...args: TArgs) => Promise<TReturn>;

export interface DecoratorOptions {
  name?: string;
  logArgs?: boolean;
  logResult?: boolean;
}

/**
 * Logging decorator
 */
export function withLogging<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options?: DecoratorOptions
): (...args: TArgs) => Promise<TReturn> {
  const name = options?.name || fn.name || 'anonymous';

  return async (...args: TArgs): Promise<TReturn> => {
    const startTime = performance.now();

    logger.info({
      function: name,
      args: options?.logArgs ? args : undefined,
    }, `→ ${name} called`);

    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;

      logger.info({
        function: name,
        duration,
        result: options?.logResult ? result : undefined,
      }, `← ${name} completed`);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      logger.error({
        function: name,
        error: errorMsg,
        duration,
      }, `✗ ${name} failed`);

      throw error;
    }
  };
}

/**
 * Timing decorator
 */
export function withTiming<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  name?: string
): (...args: TArgs) => Promise<TReturn> {
  const fnName = name || fn.name || 'anonymous';

  return async (...args: TArgs): Promise<TReturn> => {
    const startTime = performance.now();

    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;

      metrics.observe(`${metricNames.FUNCTION_DURATION}.duration`, duration, {
        function: fnName,
      });

      logger.debug({
        function: fnName,
        duration,
      }, `Function timing`);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      metrics.observe(`${metricNames.FUNCTION_DURATION}.duration`, duration, {
        function: fnName,
        error: 'true',
      });

      throw error;
    }
  };
}

/**
 * Caching decorator
 */
export function withCaching<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    ttl?: number;
    keyFn?: (...args: TArgs) => string;
    name?: string;
  } = {}
): (...args: TArgs) => Promise<TReturn> {
  const cache = new Map<string, { value: TReturn; expiry: number }>();
  const ttl = options.ttl || 60000;
  const fnName = options.name || fn.name || 'anonymous';

  return async (...args: TArgs): Promise<TReturn> => {
    const key = options.keyFn
      ? options.keyFn(...args)
      : JSON.stringify(args);

    // Check cache
    const cached = cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      metrics.increment(`${metricNames.CACHE_HITS}.decorator`, 1, { function: fnName });
      return cached.value;
    }

    // Execute function
    const result = await fn(...args);

    // Store in cache
    cache.set(key, {
      value: result,
      expiry: Date.now() + ttl,
    });

    metrics.increment(`${metricNames.CACHE_MISSES}.decorator`, 1, { function: fnName });

    return result;
  };
}

/**
 * Retry decorator
 */
export function withRetry<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    maxRetries?: number;
    delay?: number;
    backoff?: number;
    name?: string;
  } = {}
): (...args: TArgs) => Promise<TReturn> {
  const maxRetries = options.maxRetries || 3;
  const delay = options.delay || 1000;
  const backoff = options.backoff || 2;
  const fnName = options.name || fn.name || 'anonymous';

  return async (...args: TArgs): Promise<TReturn> => {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          logger.warn({
            function: fnName,
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
          }, 'Retrying function');

          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(backoff, attempt)));
        }
      }
    }

    throw lastError;
  };
}

/**
 * Rate limiting decorator
 */
export function withRateLimit<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    maxCalls?: number;
    windowMs?: number;
    name?: string;
  } = {}
): (...args: TArgs) => Promise<TReturn> {
  const maxCalls = options.maxCalls || 10;
  const windowMs = options.windowMs || 60000;
  const fnName = options.name || fn.name || 'anonymous';
  const calls: number[] = [];

  return async (...args: TArgs): Promise<TReturn> => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove old calls
    while (calls.length > 0 && calls[0] < windowStart) {
      calls.shift();
    }

    // Check rate limit
    if (calls.length >= maxCalls) {
      metrics.increment(`${metricNames.RATE_LIMIT_EXCEEDED}.decorator`, 1, { function: fnName });
      throw new Error(`Rate limit exceeded for ${fnName}`);
    }

    calls.push(now);
    return fn(...args);
  };
}

/**
 * Validation decorator
 */
export function withValidation<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  validator: (...args: TArgs) => boolean | string,
  name?: string
): (...args: TArgs) => Promise<TReturn> {
  const fnName = name || fn.name || 'anonymous';

  return async (...args: TArgs): Promise<TReturn> => {
    const result = validator(...args);

    if (result === false) {
      throw new Error(`Validation failed for ${fnName}`);
    }

    if (typeof result === 'string') {
      throw new Error(result);
    }

    return fn(...args);
  };
}

/**
 * Memoize decorator
 */
export function withMemoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    maxSize?: number;
    ttl?: number;
    name?: string;
  } = {}
): (...args: TArgs) => Promise<TReturn> {
  const cache = new Map<string, { value: TReturn; expiry: number }>();
  const maxSize = options.maxSize || 100;
  const ttl = options.ttl || 300000; // 5 minutes
  const fnName = options.name || fn.name || 'anonymous';

  return async (...args: TArgs): Promise<TReturn> => {
    const key = JSON.stringify(args);

    // Check cache
    const cached = cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    // Execute function
    const result = await fn(...args);

    // Evict if at capacity
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }

    // Store in cache
    cache.set(key, {
      value: result,
      expiry: Date.now() + ttl,
    });

    return result;
  };
}

/**
 * Compose multiple decorators
 */
export function compose<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  ...decorators: Array<(f: (...args: TArgs) => Promise<TReturn>) => (...args: TArgs) => Promise<TReturn>>
): (...args: TArgs) => Promise<TReturn> {
  return decorators.reduce((acc, decorator) => decorator(acc), fn);
}
