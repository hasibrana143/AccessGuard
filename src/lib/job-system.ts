import { Queue, Worker, type Job, type JobsOptions } from 'bullmq';
import { getRedis, isRedisReady } from './redis';
import { logger } from './error-logger';
import { metrics, metricNames } from './metrics';

// Queue configurations
const QUEUE_CONFIGS = {
  scans: {
    name: 'scans',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
  emails: {
    name: 'emails',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5000 },
      removeOnComplete: 50,
      removeOnFail: 25,
    },
  },
  reports: {
    name: 'reports',
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential' as const, delay: 10000 },
      removeOnComplete: 20,
      removeOnFail: 10,
    },
  },
  cleanup: {
    name: 'cleanup',
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: 10,
      removeOnFail: 10,
    },
  },
  webhooks: {
    name: 'webhooks',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 3000 },
      removeOnComplete: 50,
      removeOnFail: 25,
    },
  },
} as const;

// Dead letter queue
const DLQ_NAME = 'dead-letter';

interface JobData {
  [key: string]: unknown;
}

class JobSystem {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private deadLetterQueue: Queue | null = null;

  private getQueue(name: string): Queue | null {
    if (!isRedisReady()) {
      logger.warn('Redis not available, skipping queue operation');
      return null;
    }

    if (!this.queues.has(name)) {
      const config = QUEUE_CONFIGS[name as keyof typeof QUEUE_CONFIGS];
      if (!config) {
        logger.error({ queueName: name }, 'Unknown queue');
        return null;
      }

      const redis = getRedis();
      if (!redis) return null;

      const queue = new Queue(config.name, {
        connection: redis,
        defaultJobOptions: config.defaultJobOptions,
      });

      this.queues.set(name, queue);
    }

    return this.queues.get(name) || null;
  }

  private getDeadLetterQueue(): Queue | null {
    if (this.deadLetterQueue) return this.deadLetterQueue;
    if (!isRedisReady()) return null;

    const redis = getRedis();
    if (!redis) return null;

    this.deadLetterQueue = new Queue(DLQ_NAME, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 0,
      },
    });

    return this.deadLetterQueue;
  }

  // Add a job to a queue
  async addJob(queueName: string, data: JobData, options?: JobsOptions): Promise<string | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    try {
      const job = await queue.add(queueName, data, options);
      metrics.increment(metricNames.QUEUE_JOBS, 1, { queue: queueName, status: 'added' });
      logger.info({ jobId: job.id, queueName }, 'Job added');
      return job.id || null;
    } catch (err) {
      logger.error({ err, queueName }, 'Failed to add job');
      return null;
    }
  }

  // Process jobs from a queue
  async processJob(queueName: string, processor: (data: JobData) => Promise<void>): Promise<void> {
    if (!isRedisReady()) {
      logger.warn('Redis not available, skipping worker setup');
      return;
    }

    const redis = getRedis();
    if (!redis) return;

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const startTime = performance.now();
        try {
          await processor(job.data);
          const duration = performance.now() - startTime;
          metrics.observe(metricNames.QUEUE_DURATION, duration, { queue: queueName, status: 'success' });
          logger.info({ jobId: job.id, queueName, duration }, 'Job completed');
        } catch (err) {
          const duration = performance.now() - startTime;
          metrics.observe(metricNames.QUEUE_DURATION, duration, { queue: queueName, status: 'failed' });
          logger.error({ err, jobId: job.id, queueName }, 'Job failed');
          throw err;
        }
      },
      {
        connection: redis,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );

    // Handle failed jobs
    worker.on('failed', async (job, err) => {
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        // Move to dead letter queue
        const dlq = this.getDeadLetterQueue();
        if (dlq) {
          await dlq.add('failed-job', {
            originalQueue: queueName,
            jobId: job.id,
            data: job.data,
            error: err.message,
            failedAt: new Date(),
          });
          logger.warn({ jobId: job.id, queueName }, 'Job moved to dead letter queue');
        }
      }
    });

    this.workers.set(queueName, worker);
    logger.info({ queueName }, 'Worker started');
  }

  // Get queue stats
  async getStats(queueName: string): Promise<Record<string, number> | null> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      return { waiting, active, completed, failed };
    } catch (err) {
      logger.error({ err, queueName }, 'Failed to get queue stats');
      return null;
    }
  }

  // Get dead letter queue jobs
  async getDeadLetterJobs(): Promise<JobData[]> {
    const dlq = this.getDeadLetterQueue();
    if (!dlq) return [];

    try {
      const jobs = await dlq.getJobs(['waiting', 'active', 'completed', 'failed']);
      return jobs.map(job => job.data);
    } catch (err) {
      logger.error({ err }, 'Failed to get dead letter jobs');
      return [];
    }
  }

  // Retry a dead letter job
  async retryDeadLetterJob(jobId: string, targetQueue: string): Promise<boolean> {
    const dlq = this.getDeadLetterQueue();
    if (!dlq) return false;

    try {
      const job = await dlq.getJob(jobId);
      if (!job) return false;

      const queue = this.getQueue(targetQueue);
      if (!queue) return false;

      await queue.add(targetQueue, job.data);
      await job.remove();
      logger.info({ jobId, targetQueue }, 'Dead letter job retried');
      return true;
    } catch (err) {
      logger.error({ err, jobId }, 'Failed to retry dead letter job');
      return false;
    }
  }

  // Shutdown all workers
  async shutdown(): Promise<void> {
    for (const [name, worker] of this.workers) {
      await worker.close();
      logger.info({ queueName: name }, 'Worker closed');
    }
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info({ queueName: name }, 'Queue closed');
    }
    if (this.deadLetterQueue) {
      await this.deadLetterQueue.close();
    }
  }
}

export const jobSystem = new JobSystem();

// Job types
export interface ScanJobData extends JobData {
  projectId: string;
  url: string;
  userId: string;
  options?: {
    useBrowser?: boolean;
    html?: string;
    enforcePlanLimits?: boolean;
  };
}

export interface EmailJobData extends JobData {
  to: string;
  template: string;
  data: Record<string, unknown>;
}

export interface ReportJobData extends JobData {
  projectId: string;
  userId: string;
  reportType: string;
}

export interface WebhookJobData extends JobData {
  url: string;
  event: string;
  payload: Record<string, unknown>;
  secret: string;
}
