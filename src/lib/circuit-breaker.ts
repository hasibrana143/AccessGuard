/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascade failures by stopping requests to failing services.
 * States: CLOSED (normal) → OPEN (blocking) → HALF_OPEN (testing)
 * 
 * Usage:
 *   import { CircuitBreaker } from '@/lib/circuit-breaker';
 *   
 *   const breaker = new CircuitBreaker('stripe-api', {
 *     failureThreshold: 5,
 *     resetTimeout: 30000,
 *   });
 *   
 *   const result = await breaker.execute(async () => {
 *     return await stripe.charges.create({...});
 *   });
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;    // Failures before opening
  successThreshold: number;    // Successes before closing
  resetTimeout: number;        // ms before trying half-open
  monitoringWindow: number;    // ms to count failures
  halfOpenMaxCalls: number;    // Max calls in half-open state
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastStateChange: Date;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  totalTimeouts: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeout: 30000,
  monitoringWindow: 60000,
  halfOpenMaxCalls: 3,
};

export class CircuitBreaker {
  private name: string;
  private options: CircuitBreakerOptions;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastStateChange = new Date();
  private halfOpenCalls = 0;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalTimeouts = 0;

  constructor(name: string, options?: Partial<CircuitBreakerOptions>) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (this.shouldTryReset()) {
        this.setState('HALF_OPEN');
      } else {
        throw new CircuitOpenError(this.name, this.getState());
      }
    }

    // Check half-open call limit
    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
      throw new CircuitOpenError(this.name, this.getState());
    }

    this.totalRequests++;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.successCount++;
    this.lastFailureTime = undefined;

    // Record metrics
    metrics.increment(`${metricNames.CIRCUIT_BREAKER_CALLS}.success`, 1, {
      circuit: this.name,
    });

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.options.successThreshold) {
        this.setState('CLOSED');
        this.failureCount = 0;
        this.successCount = 0;
        logger.info({ circuit: this.name }, 'Circuit closed - service recovered');
      }
    } else {
      // Reset failure count on success
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  /**
   * Handle failed call
   */
  private onFailure(error: unknown): void {
    this.totalFailures++;
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = new Date();

    const isTimeout = error instanceof Error && 
      (error.message.includes('timeout') || error.name === 'TimeoutError');

    if (isTimeout) {
      this.totalTimeouts++;
    }

    // Record metrics
    metrics.increment(`${metricNames.CIRCUIT_BREAKER_CALLS}.failure`, 1, {
      circuit: this.name,
      isTimeout: String(isTimeout),
    });

    if (this.state === 'HALF_OPEN') {
      // Failed during half-open, go back to OPEN
      this.setState('OPEN');
      logger.warn({ circuit: this.name }, 'Circuit opened - half-open test failed');
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.setState('OPEN');
      logger.error({ 
        circuit: this.name,
        failureCount: this.failureCount,
        threshold: this.options.failureThreshold,
      }, 'Circuit opened - too many failures');
    }
  }

  /**
   * Check if we should try half-open
   */
  private shouldTryReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime.getTime() >= this.options.resetTimeout;
  }

  /**
   * Set circuit state
   */
  private setState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = new Date();
    this.halfOpenCalls = 0;

    // Record state change metric
    metrics.increment(metricNames.CIRCUIT_BREAKER_STATE_CHANGES, 1, {
      circuit: this.name,
      from: oldState,
      to: newState,
    });

    logger.info({ 
      circuit: this.name,
      oldState,
      newState,
    }, 'Circuit state changed');
  }

  /**
   * Get current stats
   */
  getState(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalTimeouts: this.totalTimeouts,
    };
  }

  /**
   * Force reset circuit (for testing/manual intervention)
   */
  forceReset(): void {
    this.setState('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    logger.info({ circuit: this.name }, 'Circuit force reset');
  }

  /**
   * Force open circuit (for maintenance)
   */
  forceOpen(): void {
    this.setState('OPEN');
    logger.info({ circuit: this.name }, 'Circuit force opened');
  }
}

/**
 * Error thrown when circuit is open
 */
export class CircuitOpenError extends Error {
  circuitName: string;
  circuitState: CircuitBreakerStats;

  constructor(name: string, state: CircuitBreakerStats) {
    super(`Circuit breaker '${name}' is OPEN - requests blocked`);
    this.name = 'CircuitOpenError';
    this.circuitName = name;
    this.circuitState = state;
  }
}

/**
 * Circuit breaker registry
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  get(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getState();
    }
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceReset();
    }
  }
}

export const circuitBreakers = new CircuitBreakerRegistry();

// Pre-configured circuit breakers
export const externalAPIBreaker = circuitBreakers.get('external-api', {
  failureThreshold: 3,
  resetTimeout: 60000,
  monitoringWindow: 120000,
});

export const databaseBreaker = circuitBreakers.get('database', {
  failureThreshold: 5,
  resetTimeout: 30000,
});

export const redisBreaker = circuitBreakers.get('redis', {
  failureThreshold: 5,
  resetTimeout: 15000,
});
