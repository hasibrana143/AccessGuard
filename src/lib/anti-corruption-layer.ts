/**
 * Anti-Corruption Layer (ACL)
 * 
 * Isolates your domain from external service models.
 * Translates between your domain and external APIs.
 * 
 * Features:
 * - Model translation
 * - API adaptation
 * - Fallback mechanisms
 * - Circuit breaker integration
 * - Health monitoring
 * 
 * Usage:
 *   import { ACL } from '@/lib/anti-corruption-layer';
 *   
 *   const stripeACL = new ACL('stripe', {
 *     translateOut: (payment) => stripe.adaptPayment(payment),
 *     translateIn: (stripePayment) => adaptToDomain(stripePayment),
 *   });
 *   
 *   const result = await stripeACL.execute(
 *     () => stripe.charges.create({...}),
 *     fallbackValue
 *   );
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import { circuitBreakers } from './circuit-breaker';

export interface ACLTranslation<TInput, TOutput> {
  translateIn?: (external: TInput) => TOutput;
  translateOut?: (domain: TOutput) => TInput;
}

export interface ACLOptions {
  timeout: number;
  retryCount: number;
  fallbackValue?: unknown;
  circuitBreaker?: string;
  enableMetrics: boolean;
}

export interface ACLResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'external' | 'fallback' | 'cache';
  duration: number;
}

export interface ACLHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCall: Date;
  successRate: number;
  avgResponseTime: number;
  circuitBreakerState: string;
}

const DEFAULT_OPTIONS: ACLOptions = {
  timeout: 10000,
  retryCount: 2,
  enableMetrics: true,
};

/**
 * Anti-Corruption Layer
 */
export class ACL<TExternal = unknown, TDomain = unknown> {
  private name: string;
  private options: ACLOptions;
  private translation: ACLTranslation<TExternal, TDomain>;
  private healthStats = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalDuration: 0,
    lastCall: new Date(),
  };

  constructor(
    name: string,
    translation: ACLTranslation<TExternal, TDomain>,
    options?: Partial<ACLOptions>
  ) {
    this.name = name;
    this.translation = translation;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute external call with translation
   */
  async execute<R>(
    externalCall: () => Promise<TExternal>,
    fallbackValue?: TDomain
  ): Promise<ACLResult<TDomain>> {
    const startTime = performance.now();
    this.healthStats.totalCalls++;
    this.healthStats.lastCall = new Date();

    try {
      let result: TExternal;

      // Use circuit breaker if configured
      if (this.options.circuitBreaker) {
        const breaker = circuitBreakers.get(this.options.circuitBreaker);
        result = await breaker.execute(externalCall);
      } else {
        // Execute with timeout
        result = await Promise.race([
          externalCall(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${this.name} ACL timeout`)), this.options.timeout)
          ),
        ]);
      }

      // Translate to domain model
      const domainResult = this.translation.translateIn
        ? this.translation.translateIn(result)
        : (result as unknown as TDomain);

      const duration = performance.now() - startTime;

      // Update health stats
      this.healthStats.successfulCalls++;
      this.healthStats.totalDuration += duration;

      // Record metrics
      if (this.options.enableMetrics) {
        metrics.increment(`${metricNames.ACL_CALLS}.success`, 1, { acl: this.name });
        metrics.observe(`${metricNames.ACL_DURATION}.duration`, duration, { acl: this.name });
      }

      return {
        success: true,
        data: domainResult,
        source: 'external',
        duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Update health stats
      this.healthStats.failedCalls++;

      // Record metrics
      if (this.options.enableMetrics) {
        metrics.increment(`${metricNames.ACL_CALLS}.failure`, 1, { acl: this.name });
      }

      logger.error({
        acl: this.name,
        error: errorMsg,
        duration,
      }, 'ACL call failed');

      // Return fallback if available
      if (fallbackValue !== undefined) {
        return {
          success: true,
          data: fallbackValue,
          source: 'fallback',
          duration,
        };
      }

      return {
        success: false,
        error: errorMsg,
        source: 'external',
        duration,
      };
    }
  }

  /**
   * Translate domain model to external format
   */
  translateToExternal(domain: TDomain): TExternal | null {
    if (!this.translation.translateOut) {
      return null;
    }
    return this.translation.translateOut(domain);
  }

  /**
   * Translate external model to domain format
   */
  translateToDomain(external: TExternal): TDomain {
    if (!this.translation.translateIn) {
      return external as unknown as TDomain;
    }
    return this.translation.translateIn(external);
  }

  /**
   * Get health status
   */
  getHealth(): ACLHealth {
    const successRate = this.healthStats.totalCalls > 0
      ? (this.healthStats.successfulCalls / this.healthStats.totalCalls) * 100
      : 100;

    const avgResponseTime = this.healthStats.successfulCalls > 0
      ? this.healthStats.totalDuration / this.healthStats.successfulCalls
      : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (successRate < 50) status = 'unhealthy';
    else if (successRate < 90) status = 'degraded';

    return {
      name: this.name,
      status,
      lastCall: this.healthStats.lastCall,
      successRate,
      avgResponseTime,
      circuitBreakerState: this.options.circuitBreaker
        ? circuitBreakers.get(this.options.circuitBreaker).getState().state
        : 'N/A',
    };
  }
}

/**
 * Pre-configured ACLs for common services
 */
export const acls = {
  /**
   * Stripe ACL
   */
  stripe: new ACL('stripe', {
    translateIn: (data: Record<string, unknown>) => ({
      id: data.id as string,
      amount: data.amount as number,
      status: data.status as string,
    }),
  }, {
    timeout: 15000,
    circuitBreaker: 'external-api',
  }),

  /**
   * GitHub ACL
   */
  github: new ACL('github', {
    translateIn: (data: Record<string, unknown>) => ({
      id: data.id as number,
      name: data.name as string,
      fullName: data.full_name as string,
    }),
  }, {
    timeout: 10000,
    circuitBreaker: 'external-api',
  }),

  /**
   * Email Service ACL
   */
  email: new ACL('email-service', {
    translateIn: (data: Record<string, unknown>) => ({
      messageId: data.messageId as string,
      status: data.status as string,
    }),
  }, {
    timeout: 10000,
    fallbackValue: { messageId: 'fallback', status: 'queued' },
  }),
};
