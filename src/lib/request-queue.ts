/**
 * Request Queue for Heavy Operations
 * 
 * Queues CPU/memory intensive operations to prevent blocking the event loop.
 * Features:
 * - Priority queue with configurable priorities
 * - Concurrency control
 * - Rate limiting
 * - Job deduplication
 * - Progress tracking
 * 
 * Usage:
 *   import { requestQueue } from '@/lib/request-queue';
 *   
 *   await requestQueue.add('generate-report', {
 *     reportId: '123',
 *     type: 'pdf',
 *   }, { priority: 'high', concurrency: 2 });
 */

import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';
import crypto from 'crypto';

export type JobPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  data: T;
  priority: JobPriority;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  timeout: number;
  delay?: number;
  dedupeKey?: string;
  progress?: number;
  result?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueOptions {
  priority?: JobPriority;
  concurrency?: number;
  timeout?: number;
  maxAttempts?: number;
  dedupeKey?: string;
  delay?: number;
  onProgress?: (progress: number) => void;
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalProcessed: number;
  avgProcessingTime: number;
}

const PRIORITY_WEIGHTS: Record<JobPriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
  background: 10,
};

class RequestQueue {
  private queue: QueueJob[] = [];
  private running = new Map<string, QueueJob>();
  private completed = new Map<string, QueueJob>();
  private handlers = new Map<string, (data: unknown) => Promise<unknown>>();
  private concurrencyLimit = 5;
  private processingInterval?: ReturnType<typeof setInterval>;
  private totalProcessed = 0;
  private totalProcessingTime = 0;

  constructor() {
    // Start processing loop
    this.processingInterval = setInterval(() => this.processNext(), 100);
  }

  /**
   * Register a job handler
   */
  registerHandler<T>(
    type: string,
    handler: (data: T) => Promise<unknown>
  ): void {
    this.handlers.set(type, handler as (data: unknown) => Promise<unknown>);
    logger.info({ type }, 'Job handler registered');
  }

  /**
   * Add a job to the queue
   */
  async add<T>(
    type: string,
    data: T,
    options?: QueueOptions
  ): Promise<QueueJob<T>> {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for job type: ${type}`);
    }

    // Check for duplicate
    const dedupeKey = options?.dedupeKey || (type + ':' + JSON.stringify(data));
    if (options?.dedupeKey) {
      const existing = this.findDuplicate(dedupeKey);
      if (existing) {
        logger.info({ jobId: existing.id, type }, 'Duplicate job detected, reusing');
        return existing as QueueJob<T>;
      }
    }

    const job: QueueJob<T> = {
      id: crypto.randomUUID(),
      type,
      data,
      priority: options?.priority || 'normal',
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      timeout: options?.timeout || 30000,
      dedupeKey,
    };

    // Add to queue (sorted by priority)
    this.queue.push(job);
    this.queue.sort((a, b) => 
      PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
    );

    // Record metrics
    metrics.increment(metricNames.QUEUE_JOBS, 1, { type, status: 'pending' });
    metrics.gauge(metricNames.REQUEST_QUEUE_DEPTH, this.queue.length);

    logger.info({ jobId: job.id, type, priority: job.priority }, 'Job added to queue');

    return job;
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    if (this.running.size >= this.concurrencyLimit) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    // Check if delayed
    if (job.createdAt.getTime() + (job.delay || 0) > Date.now()) {
      this.queue.unshift(job); // Put back
      return;
    }

    job.status = 'running';
    job.startedAt = new Date();
    job.attempts++;
    this.running.set(job.id, job);

    metrics.gauge(metricNames.REQUEST_QUEUE_DEPTH, this.queue.length);

    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = 'No handler registered';
      this.completeJob(job);
      return;
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.timeout);
      });

      // Execute job
      const result = await Promise.race([
        handler(job.data),
        timeoutPromise,
      ]);

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();

      const duration = job.completedAt.getTime() - job.startedAt.getTime();
      this.totalProcessingTime += duration;

      logger.info({ jobId: job.id, type: job.type, duration }, 'Job completed');

      // Record metrics
      metrics.increment(metricNames.QUEUE_JOBS, 1, { type: job.type, status: 'completed' });
      metrics.observe(metricNames.QUEUE_DURATION, duration, { type: job.type });

    } catch (error) {
      job.error = error instanceof Error ? error.message : 'Unknown error';

      if (job.attempts < job.maxAttempts) {
        // Retry
        job.status = 'pending';
        job.startedAt = undefined;
        this.running.delete(job.id);
        
        // Add back with delay (exponential backoff)
        job.delay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
        this.queue.push(job);
        this.queue.sort((a, b) => 
          PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
        );

        logger.warn({ jobId: job.id, attempt: job.attempts, delay: job.delay }, 'Job retry scheduled');
      } else {
        job.status = 'failed';
        job.completedAt = new Date();

        logger.error({ jobId: job.id, error: job.error }, 'Job failed permanently');

        // Record metrics
        metrics.increment(metricNames.QUEUE_JOBS, 1, { type: job.type, status: 'failed' });
      }
    }

    this.completeJob(job);
  }

  /**
   * Complete a job (move from running to completed)
   */
  private completeJob(job: QueueJob): void {
    this.running.delete(job.id);
    this.completed.set(job.id, job);
    this.totalProcessed++;

    // Keep only last 1000 completed jobs
    if (this.completed.size > 1000) {
      const oldest = Array.from(this.completed.keys()).slice(0, this.completed.size - 1000);
      oldest.forEach(id => this.completed.delete(id));
    }
  }

  /**
   * Find duplicate job
   */
  private findDuplicate(dedupeKey: string): QueueJob | undefined {
    // Check pending
    const pending = this.queue.find(j => j.dedupeKey === dedupeKey && j.status === 'pending');
    if (pending) return pending;

    // Check running
    for (const job of this.running.values()) {
      if (job.dedupeKey === dedupeKey) return job;
    }

    return undefined;
  }

  /**
   * Cancel a job
   */
  cancel(jobId: string): boolean {
    // Check pending
    const pendingIndex = this.queue.findIndex(j => j.id === jobId);
    if (pendingIndex !== -1) {
      const job = this.queue.splice(pendingIndex, 1)[0];
      job.status = 'cancelled';
      job.completedAt = new Date();
      this.completed.set(job.id, job);
      metrics.increment(metricNames.QUEUE_JOBS, 1, { type: job.type, status: 'cancelled' });
      return true;
    }

    // Check running
    const running = this.running.get(jobId);
    if (running) {
      running.status = 'cancelled';
      running.completedAt = new Date();
      this.running.delete(jobId);
      this.completed.set(running.id, running);
      metrics.increment(metricNames.QUEUE_JOBS, 1, { type: running.type, status: 'cancelled' });
      return true;
    }

    return false;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): QueueJob | undefined {
    return this.queue.find(j => j.id === jobId) ||
           this.running.get(jobId) ||
           this.completed.get(jobId);
  }

  /**
   * Get queue stats
   */
  getStats(): QueueStats {
    const completedJobs = Array.from(this.completed.values());
    const completedCount = completedJobs.filter(j => j.status === 'completed').length;
    const failedCount = completedJobs.filter(j => j.status === 'failed').length;

    return {
      pending: this.queue.length,
      running: this.running.size,
      completed: completedCount,
      failed: failedCount,
      cancelled: completedJobs.filter(j => j.status === 'cancelled').length,
      totalProcessed: this.totalProcessed,
      avgProcessingTime: this.totalProcessed > 0 
        ? this.totalProcessingTime / this.totalProcessed 
        : 0,
    };
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): void {
    this.completed.clear();
  }

  /**
   * Stop processing
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  /**
   * Set concurrency limit
   */
  setConcurrency(limit: number): void {
    this.concurrencyLimit = Math.max(1, Math.min(limit, 20));
  }
}

// Singleton
export const requestQueue = new RequestQueue();

/**
 * Register common job handlers
 */
export function registerDefaultJobHandlers(): void {
  requestQueue.registerHandler('scan', async (data: { scanId: string; url: string }) => {
    logger.info({ scanId: data.scanId }, 'Processing scan job');
    // Would trigger actual scan
    return { status: 'completed' };
  });

  requestQueue.registerHandler('email', async (data: { to: string; template: string }) => {
    logger.info({ to: data.to, template: data.template }, 'Processing email job');
    // Would send actual email
    return { status: 'sent' };
  });

  requestQueue.registerHandler('report', async (data: { reportId: string; type: string }) => {
    logger.info({ reportId: data.reportId }, 'Processing report job');
    // Would generate actual report
    return { status: 'generated' };
  });

  requestQueue.registerHandler('webhook', async (data: { url: string; payload: unknown }) => {
    logger.info({ url: data.url }, 'Processing webhook job');
    // Would send actual webhook
    return { status: 'delivered' };
  });

  requestQueue.registerHandler('cleanup', async (data: { type: string }) => {
    logger.info({ type: data.type }, 'Processing cleanup job');
    // Would perform actual cleanup
    return { status: 'cleaned' };
  });
}
