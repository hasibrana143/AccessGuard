/**
 * Saga Pattern
 * 
 * Manages distributed transactions across multiple services.
 * Uses compensating transactions for rollback on failure.
 * 
 * Features:
 * - Choreography-based sagas
 * - Orchestration-based sagas
 * - Compensating transactions
 * - Step-by-step execution with rollback
 * 
 * Usage:
 *   import { Saga } from '@/lib/saga';
 *   
 *   const saga = new Saga('scan-project');
 *   saga
 *     .step('validate', validateProject,补偿validateProject)
 *     .step('start-scan', startScan, compensateStartScan)
 *     .step('process-results', processResults, compensateProcessResults);
 *   
 *   await saga.execute({ projectId: '123' });
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';

export type SagaStep<T = Record<string, unknown>> = {
  name: string;
  execute: (context: T) => Promise<T>;
  compensate: (context: T) => Promise<void>;
  timeout?: number;
};

export interface SagaOptions {
  timeout: number;          // Total saga timeout
  stepTimeout: number;      // Per-step timeout
  maxRetries: number;       // Retries per step
  compensationTimeout: number;
}

export interface SagaResult<T = Record<string, unknown>> {
  success: boolean;
  context: T;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
  duration: number;
}

const DEFAULT_OPTIONS: SagaOptions = {
  timeout: 60000,           // 1 minute
  stepTimeout: 30000,       // 30 seconds
  maxRetries: 2,
  compensationTimeout: 10000,
};

export class Saga<T extends Record<string, unknown> = Record<string, unknown>> {
  private name: string;
  private steps: SagaStep<T>[] = [];
  private options: SagaOptions;

  constructor(name: string, options?: Partial<SagaOptions>) {
    this.name = name;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Add a step to the saga
   */
  step(
    name: string,
    execute: (context: T) => Promise<T>,
    compensate: (context: T) => Promise<void>,
    options?: { timeout?: number }
  ): Saga<T> {
    this.steps.push({
      name,
      execute,
      compensate,
      timeout: options?.timeout || this.options.stepTimeout,
    });
    return this;
  }

  /**
   * Execute the saga
   */
  async execute(initialContext: T): Promise<SagaResult<T>> {
    const startTime = performance.now();
    const completedSteps: string[] = [];
    let context = { ...initialContext };
    let failedStep: string | undefined;
    let error: string | undefined;

    logger.info({
      saga: this.name,
      steps: this.steps.length,
    }, 'Saga execution started');

    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];

        // Check total timeout
        if (performance.now() - startTime > this.options.timeout) {
          failedStep = step.name;
          error = 'Saga timeout';
          break;
        }

        // Execute step with timeout and retries
        let stepSuccess = false;
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
          try {
            const stepResult = await this.executeStep(step, context);
            context = { ...context, ...stepResult };
            completedSteps.push(step.name);
            stepSuccess = true;

            logger.info({
              saga: this.name,
              step: step.name,
              attempt,
            }, 'Saga step completed');

            break;
          } catch (stepError) {
            lastError = stepError instanceof Error ? stepError : new Error(String(stepError));
            
            logger.warn({
              saga: this.name,
              step: step.name,
              attempt,
              error: lastError.message,
            }, 'Saga step failed, retrying');

            if (attempt === this.options.maxRetries) {
              failedStep = step.name;
              error = lastError.message;
            }
          }
        }

        if (!stepSuccess) {
          break;
        }
      }

      // Compensate if failed
      if (failedStep) {
        await this.compensate(completedSteps, context);
      }

      const duration = performance.now() - startTime;
      const success = !failedStep;

      // Record metrics
      metrics.increment(metricNames.SAGA_EXECUTED, 1, {
        name: this.name,
        success: String(success),
      });
      metrics.observe(`${metricNames.SAGA_DURATION}.duration`, duration, {
        name: this.name,
      });

      logger.info({
        saga: this.name,
        success,
        completedSteps,
        failedStep,
        duration,
      }, 'Saga execution completed');

      return {
        success,
        context,
        completedSteps,
        failedStep,
        error,
        duration,
      };
    } catch (sagaError) {
      const duration = performance.now() - startTime;
      const errorMsg = sagaError instanceof Error ? sagaError.message : 'Unknown saga error';

      metrics.increment(metricNames.SAGA_FAILED, 1, { name: this.name });

      logger.error({
        saga: this.name,
        error: errorMsg,
        completedSteps,
        duration,
      }, 'Saga execution failed');

      // Compensate on critical failure
      await this.compensate(completedSteps, context);

      return {
        success: false,
        context,
        completedSteps,
        failedStep: this.steps[completedSteps.length]?.name,
        error: errorMsg,
        duration,
      };
    }
  }

  /**
   * Execute single step with timeout
   */
  private async executeStep(step: SagaStep<T>, context: T): Promise<Partial<T>> {
    return Promise.race([
      step.execute(context),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Step '${step.name}' timeout`)), step.timeout)
      ),
    ]);
  }

  /**
   * Compensate completed steps in reverse order
   */
  private async compensate(completedSteps: string[], context: T): Promise<void> {
    logger.info({
      saga: this.name,
      stepsToCompensate: completedSteps,
    }, 'Starting saga compensation');

    // Compensate in reverse order
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const stepName = completedSteps[i];
      const step = this.steps.find(s => s.name === stepName);

      if (!step) continue;

      try {
        await Promise.race([
          step.compensate(context),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Compensation timeout')), this.options.compensationTimeout)
          ),
        ]);

        logger.info({
          saga: this.name,
          step: stepName,
        }, 'Saga step compensated');
      } catch (compensationError) {
        logger.error({
          saga: this.name,
          step: stepName,
          error: compensationError instanceof Error ? compensationError.message : 'Unknown',
        }, 'Saga compensation failed - MANUAL INTERVENTION REQUIRED');
      }
    }
  }
}

// Pre-configured sagas
export const sagas = {
  /**
   * Scan project saga
   */
  scanProject: () => new Saga('scan-project', {
    timeout: 300000,  // 5 minutes for scans
    stepTimeout: 120000,
  }),

  /**
   * Generate report saga
   */
  generateReport: () => new Saga('generate-report', {
    timeout: 120000,
    stepTimeout: 60000,
  }),

  /**
   * Process payment saga
   */
  processPayment: () => new Saga('process-payment', {
    timeout: 30000,
    stepTimeout: 10000,
    maxRetries: 1,
  }),
};
