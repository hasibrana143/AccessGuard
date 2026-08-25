/**
 * Chain of Responsibility Pattern
 * 
 * Creates a pipeline of handlers that process requests in sequence.
 * Each handler can process the request or pass it to the next handler.
 * 
 * Features:
 * - Composable handlers
 * - Request/Response transformation
 * - Short-circuit capability
 * - Async support
 * 
 * Usage:
 *   import { Pipeline } from '@/lib/chain-of-responsibility';
 *   
 *   const pipeline = new Pipeline<Request, Response>();
 *   pipeline
 *     .use(authHandler)
 *     .use(validationHandler)
 *     .use(rateLimitHandler)
 *     .use(mainHandler);
 *   
 *   const response = await pipeline.execute(request);
 */

export interface Handler<TInput, TOutput> {
  name: string;
  handle: (input: TInput, next: () => Promise<TOutput>) => Promise<TOutput>;
}

export interface PipelineResult<TOutput> {
  success: boolean;
  data?: TOutput;
  error?: string;
  handler?: string;
  duration: number;
  handlersExecuted: string[];
}

/**
 * Pipeline class
 */
export class Pipeline<TInput, TOutput> {
  private handlers: Handler<TInput, TOutput>[] = [];
  private errorHandler?: (error: Error, input: TInput) => Promise<TOutput>;

  /**
   * Add handler to pipeline
   */
  use(handler: Handler<TInput, TOutput>): this {
    this.handlers.push(handler);
    return this;
  }

  /**
   * Add multiple handlers
   */
  useAll(handlers: Handler<TInput, TOutput>[]): this {
    this.handlers.push(...handlers);
    return this;
  }

  /**
   * Set error handler
   */
  onError(handler: (error: Error, input: TInput) => Promise<TOutput>): this {
    this.errorHandler = handler;
    return this;
  }

  /**
   * Execute pipeline
   */
  async execute(input: TInput): Promise<PipelineResult<TOutput>> {
    const startTime = performance.now();
    const executedHandlers: string[] = [];

    try {
      const result = await this.executeHandler(0, input, executedHandlers);
      const duration = performance.now() - startTime;

      return {
        success: true,
        data: result,
        duration,
        handlersExecuted: executedHandlers,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      // Try error handler
      if (this.errorHandler) {
        try {
          const result = await this.errorHandler(err, input);
          return {
            success: true,
            data: result,
            duration,
            handlersExecuted: executedHandlers,
          };
        } catch {
          // Error handler failed
        }
      }

      return {
        success: false,
        error: err.message,
        handler: executedHandlers[executedHandlers.length - 1],
        duration,
        handlersExecuted: executedHandlers,
      };
    }
  }

  /**
   * Execute handler at index
   */
  private async executeHandler(
    index: number,
    input: TInput,
    executed: string[]
  ): Promise<TOutput> {
    if (index >= this.handlers.length) {
      throw new Error('No handler processed the request');
    }

    const handler = this.handlers[index];
    executed.push(handler.name);

    return handler.handle(input, () => this.executeHandler(index + 1, input, executed));
  }

  /**
   * Get handler count
   */
  getLength(): number {
    return this.handlers.length;
  }
}

// ==================== Common Handlers ====================

/**
 * Logging handler
 */
export function createLoggingHandler<TInput, TOutput>(
  name: string = 'logging'
): Handler<TInput, TOutput> {
  return {
    name,
    handle: async (input, next) => {
      console.log(`[${name}] Processing request`);
      const result = await next();
      console.log(`[${name}] Request completed`);
      return result;
    },
  };
}

/**
 * Timing handler
 */
export function createTimingHandler<TInput, TOutput>(
  name: string = 'timing'
): Handler<TInput, TOutput> {
  return {
    name,
    handle: async (input, next) => {
      const start = performance.now();
      const result = await next();
      const duration = performance.now() - start;
      console.log(`[${name}] Duration: ${duration.toFixed(2)}ms`);
      return result;
    },
  };
}

/**
 * Validation handler
 */
export function createValidationHandler<TInput extends { validate?: () => boolean }, TOutput>(
  name: string = 'validation'
): Handler<TInput, TOutput> {
  return {
    name,
    handle: async (input, next) => {
      if (input.validate && !input.validate()) {
        throw new Error('Validation failed');
      }
      return next();
    },
  };
}

/**
 * Retry handler
 */
export function createRetryHandler<TInput, TOutput>(
  maxRetries: number = 3,
  delay: number = 1000,
  name: string = 'retry'
): Handler<TInput, TOutput> {
  return {
    name,
    handle: async (input, next) => {
      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await next();
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
          }
        }
      }

      throw lastError;
    },
  };
}

/**
 * Cache handler
 */
export function createCacheHandler<TInput, TOutput>(
  cacheFn: (key: string) => TOutput | null,
  setCacheFn: (key: string, value: TOutput, ttl: number) => void,
  keyFn: (input: TInput) => string,
  ttl: number = 60000,
  name: string = 'cache'
): Handler<TInput, TOutput> {
  return {
    name,
    handle: async (input, next) => {
      const key = keyFn(input);
      const cached = cacheFn(key);

      if (cached) {
        return cached;
      }

      const result = await next();
      setCacheFn(key, result, ttl);
      return result;
    },
  };
}

/**
 * Circuit breaker handler
 */
export function createCircuitBreakerHandler<TInput, TOutput>(
  failureThreshold: number = 5,
  resetTimeout: number = 30000,
  name: string = 'circuit-breaker'
): Handler<TInput, TOutput> {
  let failures = 0;
  let lastFailure = 0;
  let isOpen = false;

  return {
    name,
    handle: async (input, next) => {
      // Check if circuit is open
      if (isOpen) {
        if (Date.now() - lastFailure > resetTimeout) {
          isOpen = false;
          failures = 0;
        } else {
          throw new Error('Circuit breaker is open');
        }
      }

      try {
        const result = await next();
        failures = 0;
        return result;
      } catch (error) {
        failures++;
        lastFailure = Date.now();

        if (failures >= failureThreshold) {
          isOpen = true;
        }

        throw error;
      }
    },
  };
}
