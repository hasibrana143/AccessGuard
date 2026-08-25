/**
 * Retry Policies
 * 
 * Multiple retry strategies for different failure scenarios.
 * 
 * Strategies:
 * - Fixed delay: Same delay between retries
 * - Exponential backoff: Doubles delay each retry
 * - Linear backoff: Adds fixed amount each retry
 * - Custom: User-defined delay function
 * 
 * Usage:
 *   import { withRetry, retryStrategies } from '@/lib/retry';
 *   
 *   const result = await withRetry(async () => {
 *     return await apiCall();
 *   }, { strategy: 'exponential', maxRetries: 3 });
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';

export type RetryStrategy = 'fixed' | 'exponential' | 'linear' | 'custom';

export interface RetryOptions {
  strategy: RetryStrategy;
  maxRetries: number;
  baseDelay: number;          // Base delay in ms
  maxDelay: number;           // Maximum delay in ms
  jitter: boolean;            // Add random jitter
  retryIf?: (error: Error) => boolean;  // Conditional retry
  onRetry?: (error: Error, attempt: number) => void;  // Callback
  customDelay?: (attempt: number) => number;  // Custom delay function
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  retryHistory: Array<{
    attempt: number;
    error: string;
    delay: number;
    timestamp: Date;
  }>;
}

const DEFAULT_OPTIONS: RetryOptions = {
  strategy: 'exponential',
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  jitter: true,
};

/**
 * Calculate delay based on strategy
 */
function calculateDelay(
  attempt: number,
  options: RetryOptions
): number {
  let delay: number;

  switch (options.strategy) {
    case 'fixed':
      delay = options.baseDelay;
      break;

    case 'exponential':
      delay = options.baseDelay * Math.pow(2, attempt);
      break;

    case 'linear':
      delay = options.baseDelay * (attempt + 1);
      break;

    case 'custom':
      delay = options.customDelay?.(attempt) ?? options.baseDelay;
      break;

    default:
      delay = options.baseDelay;
  }

  // Apply max delay cap
  delay = Math.min(delay, options.maxDelay);

  // Add jitter if enabled
  if (options.jitter) {
    const jitterAmount = delay * 0.1; // 10% jitter
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }

  return Math.max(0, delay);
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const retryHistory: RetryResult<T>['retryHistory'] = [];
  const startTime = performance.now();

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const result = await fn();
      const totalDuration = performance.now() - startTime;

      if (attempt > 0) {
        logger.info({
          attempts: attempt + 1,
          totalDuration,
          strategy: opts.strategy,
        }, 'Operation succeeded after retries');
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt >= opts.maxRetries) {
        // No more retries
        const totalDuration = performance.now() - startTime;
        logger.error({
          error: err.message,
          attempts: attempt + 1,
          totalDuration,
          strategy: opts.strategy,
        }, 'Operation failed after all retries');
        throw err;
      }

      if (opts.retryIf && !opts.retryIf(err)) {
        // Error not retryable
        throw err;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, opts);

      // Log retry
      retryHistory.push({
        attempt: attempt + 1,
        error: err.message,
        delay,
        timestamp: new Date(),
      });

      logger.warn({
        error: err.message,
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delay,
        strategy: opts.strategy,
      }, 'Retrying operation');

      // Call retry callback
      opts.onRetry?.(err, attempt + 1);

      // Record metrics
      metrics.increment(metricNames.RETRY_ATTEMPT, 1, {
        strategy: opts.strategy,
        error: err.name,
      });

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error('Retry loop completed without result');
}

/**
 * Execute with retry and fallback
 */
export async function withRetryAndFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  try {
    return await withRetry(primary, options);
  } catch {
    logger.warn('Primary operation failed, executing fallback');
    return await fallback();
  }
}

/**
 * Retry with timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeout: number,
  options?: Partial<RetryOptions>
): Promise<T> {
  return withRetry(
    () => Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      ),
    ]),
    options
  );
}

/**
 * Pre-configured retry strategies
 */
export const retryStrategies = {
  /**
   * Fast retry for transient errors
   */
  fast: (options?: Partial<RetryOptions>): RetryOptions => ({
    strategy: 'exponential',
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    jitter: true,
    ...options,
  }),

  /**
   * Standard retry
   */
  standard: (options?: Partial<RetryOptions>): RetryOptions => ({
    strategy: 'exponential',
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true,
    ...options,
  }),

  /**
   * Aggressive retry for critical operations
   */
  aggressive: (options?: Partial<RetryOptions>): RetryOptions => ({
    strategy: 'exponential',
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
    ...options,
  }),

  /**
   * Fixed delay retry
   */
  fixed: (options?: Partial<RetryOptions>): RetryOptions => ({
    strategy: 'fixed',
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: false,
    ...options,
  }),

  /**
   * Linear backoff retry
   */
  linear: (options?: Partial<RetryOptions>): RetryOptions => ({
    strategy: 'linear',
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true,
    ...options,
  }),
};

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Network errors
  if (error.message.includes('ECONNRESET') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND')) {
    return true;
  }

  // Rate limiting
  if (error.message.includes('429') ||
      error.message.includes('Too Many Requests')) {
    return true;
  }

  // Server errors
  if (error.message.includes('500') ||
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('504')) {
    return true;
  }

  // Timeout errors
  if (error.message.includes('timeout') ||
      error.name === 'TimeoutError') {
    return true;
  }

  return false;
}

/**
 * Wait for a condition with retries
 */
export async function waitForCondition<T>(
  check: () => Promise<T | null>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = performance.now();

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    const result = await check();
    if (result !== null) {
      return result;
    }

    if (attempt < opts.maxRetries) {
      const delay = calculateDelay(attempt, opts);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Condition not met after ${opts.maxRetries + 1} attempts`);
}
