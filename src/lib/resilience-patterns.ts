/**
 * Advanced Resilience Patterns
 * 
 * Implements additional resilience patterns:
 * - Timeout with cancellation
 * - Fallback strategies
 * - Hedging (parallel requests)
 * - Rate Limiting (token bucket)
 * - Load Shedding
 * - Adaptive Concurrency
 * 
 * Usage:
 *   import { Timeout, Fallback, Hedging } from '@/lib/resilience-patterns';
 *   
 *   // Timeout
 *   const result = await Timeout.run(fetch('api/data'), { timeout: 5000 });
 *   
 *   // Fallback
 *   const result = await Fallback.run(
 *     () => fetchPrimary(),
 *     () => fetchFallback()
 *   );
 *   
 *   // Hedging
 *   const result = await Hedging.run(
 *     () => fetchFromPrimary(),
 *     { hedgeDelay: 100, maxHedges: 2 }
 *   );
 */

// ============ Timeout ============

export class Timeout {
  /**
   * Run operation with timeout
   */
  static async run<T>(
    operation: Promise<T>,
    options: { timeout: number; message?: string }
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(options.message || 'Operation timed out'));
      }, options.timeout);

      operation
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Run operation with timeout and abort controller
   */
  static async runWithAbort<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    options: { timeout: number; message?: string }
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout);

    try {
      const result = await operation(controller.signal);
      clearTimeout(timer);
      return result;
    } catch (error) {
      clearTimeout(timer);
      if (controller.signal.aborted) {
        throw new TimeoutError(options.message || 'Operation timed out');
      }
      throw error;
    }
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ============ Fallback ============

export class Fallback {
  /**
   * Run with fallback strategies
   */
  static async run<T>(
    primary: () => Promise<T>,
    fallbacks: Array<() => Promise<T>>,
    options?: {
      onFallback?: (error: Error, attempt: number) => void;
    }
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      options?.onFallback?.(error as Error, 0);

      for (let i = 0; i < fallbacks.length; i++) {
        try {
          return await fallbacks[i]();
        } catch (fallbackError) {
          options?.onFallback?.(fallbackError as Error, i + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Run with cache fallback
   */
  static async withCache<T>(
    operation: () => Promise<T>,
    cache: { get(key: string): Promise<T | null>; set(key: string, value: T): Promise<void> },
    cacheKey: string
  ): Promise<T> {
    try {
      const result = await operation();
      await cache.set(cacheKey, result);
      return result;
    } catch (error) {
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
      throw error;
    }
  }
}

// ============ Hedging ============

export class Hedging {
  /**
   * Run with hedging (parallel requests)
   */
  static async run<T>(
    operation: () => Promise<T>,
    options: {
      hedgeDelay: number;
      maxHedges: number;
      onHedge?: (attempt: number) => void;
    }
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let completed = false;
      let hedgeCount = 0;
      const errors: Error[] = [];

      // Start primary request
      const primaryPromise = operation()
        .then((result) => {
          if (!completed) {
            completed = true;
            resolve(result);
          }
        })
        .catch((error) => {
          errors.push(error);
          if (errors.length > options.maxHedges && !completed) {
            completed = true;
            reject(error);
          }
        });

      // Schedule hedges
      const hedgeTimer = setInterval(() => {
        if (completed || hedgeCount >= options.maxHedges) {
          clearInterval(hedgeTimer);
          return;
        }

        hedgeCount++;
        options.onHedge?.(hedgeCount);

        operation()
          .then((result) => {
            if (!completed) {
              completed = true;
              clearInterval(hedgeTimer);
              resolve(result);
            }
          })
          .catch((error) => {
            errors.push(error);
            if (errors.length > options.maxHedges && !completed) {
              completed = true;
              clearInterval(hedgeTimer);
              reject(error);
            }
          });
      }, options.hedgeDelay);

      // Cleanup on completion
      primaryPromise.finally(() => {
        setTimeout(() => clearInterval(hedgeTimer), 0);
      });
    });
  }
}

// ============ Token Bucket Rate Limiter ============

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token
   */
  tryConsume(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Wait for token
   */
  async waitForToken(tokens = 1): Promise<void> {
    while (!this.tryConsume(tokens)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Get available tokens
   */
  get available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// ============ Load Shedder ============

export class LoadShedder {
  private requests = 0;
  private maxConcurrent: number;
  private shedCount = 0;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Try to accept request
   */
  tryAccept(): boolean {
    if (this.requests >= this.maxConcurrent) {
      this.shedCount++;
      return false;
    }

    this.requests++;
    return true;
  }

  /**
   * Release request slot
   */
  release(): void {
    if (this.requests > 0) {
      this.requests--;
    }
  }

  /**
   * Run with load shedding
   */
  async run<T>(
    operation: () => Promise<T>,
    options?: { shedResponse?: T }
  ): Promise<T> {
    if (!this.tryAccept()) {
      if (options?.shedResponse !== undefined) {
        return options.shedResponse;
      }
      throw new LoadSheddingError('Server overloaded');
    }

    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  /**
   * Get stats
   */
  getStats(): {
    current: number;
    max: number;
    shedCount: number;
  } {
    return {
      current: this.requests,
      max: this.maxConcurrent,
      shedCount: this.shedCount,
    };
  }
}

export class LoadSheddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoadSheddingError';
  }
}

// ============ Adaptive Concurrency ============

export class AdaptiveConcurrency {
  private concurrency: number;
  private minConcurrency: number;
  private maxConcurrency: number;
  private currentRequests = 0;
  private successCount = 0;
  private errorCount = 0;
  private readonly windowSize = 100;

  constructor(
    initialConcurrency: number,
    minConcurrency: number,
    maxConcurrency: number
  ) {
    this.concurrency = initialConcurrency;
    this.minConcurrency = minConcurrency;
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Check if can accept request
   */
  canAccept(): boolean {
    return this.currentRequests < this.concurrency;
  }

  /**
   * Record request start
   */
  onStart(): void {
    this.currentRequests++;
  }

  /**
   * Record request end
   */
  onEnd(success: boolean): void {
    this.currentRequests--;

    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }

    // Adjust concurrency based on success rate
    this.adjustConcurrency();
  }

  /**
   * Run with adaptive concurrency
   */
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canAccept()) {
      throw new AdaptiveConcurrencyError('Concurrency limit reached');
    }

    this.onStart();
    try {
      const result = await operation();
      this.onEnd(true);
      return result;
    } catch (error) {
      this.onEnd(false);
      throw error;
    }
  }

  private adjustConcurrency(): void {
    const total = this.successCount + this.errorCount;
    if (total < this.windowSize) return;

    const successRate = this.successCount / total;

    if (successRate > 0.99) {
      // Increase concurrency
      this.concurrency = Math.min(
        this.maxConcurrency,
        Math.ceil(this.concurrency * 1.1)
      );
    } else if (successRate < 0.95) {
      // Decrease concurrency
      this.concurrency = Math.max(
        this.minConcurrency,
        Math.floor(this.concurrency * 0.9)
      );
    }

    // Reset window
    this.successCount = 0;
    this.errorCount = 0;
  }

  /**
   * Get current concurrency
   */
  get currentConcurrency(): number {
    return this.concurrency;
  }
}

export class AdaptiveConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdaptiveConcurrencyError';
  }
}

// ============ Retry with Decorrelation ============

export class RetryWithDecorrelation {
  /**
   * Retry with decorrelated jitter
   */
  static async run<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries: number;
      baseDelay: number;
      maxDelay: number;
      onRetry?: (attempt: number, delay: number, error: Error) => void;
    }
  ): Promise<T> {
    let lastDelay = options.baseDelay;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === options.maxRetries) {
          throw error;
        }

        // Decorrelated jitter
        const delay = Math.min(
          options.maxDelay,
          Math.random() * lastDelay * 3
        );
        lastDelay = delay;

        options.onRetry?.(attempt + 1, delay, error as Error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}

// ============ Bulkhead (Isolation) ============

export class BulkheadIsolation {
  private partitions = new Map<string, { current: number; max: number }>();

  /**
   * Create partition
   */
  createPartition(name: string, maxConcurrent: number): void {
    this.partitions.set(name, { current: 0, max: maxConcurrent });
  }

  /**
   * Run in partition
   */
  async run<T>(
    partitionName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const partition = this.partitions.get(partitionName);
    if (!partition) {
      throw new Error(`Partition '${partitionName}' not found`);
    }

    if (partition.current >= partition.max) {
      throw new BulkheadError(`Partition '${partitionName}' is full`);
    }

    partition.current++;
    try {
      return await operation();
    } finally {
      partition.current--;
    }
  }

  /**
   * Get partition stats
   */
  getStats(): Record<string, { current: number; max: number; available: number }> {
    const stats: Record<string, { current: number; max: number; available: number }> = {};
    for (const [name, partition] of this.partitions) {
      stats[name] = {
        current: partition.current,
        max: partition.max,
        available: partition.max - partition.current,
      };
    }
    return stats;
  }
}

export class BulkheadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BulkheadError';
  }
}

// ============ Circuit Breaker (Advanced) ============

export class AdvancedCircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly halfOpenMaxAttempts: number;

  constructor(options: {
    failureThreshold?: number;
    recoveryTimeout?: number;
    halfOpenMaxAttempts?: number;
  } = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 30_000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts || 3;
  }

  /**
   * Run operation through circuit breaker
   */
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new CircuitOpenError('Circuit is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxAttempts) {
        this.state = 'closed';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Get circuit state
   */
  getState(): {
    state: string;
    failureCount: number;
    successCount: number;
    lastFailureTime: Date | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
        ? new Date(this.lastFailureTime)
        : null,
    };
  }

  /**
   * Reset circuit
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}
