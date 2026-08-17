import { Queue, Worker, type Job } from 'bullmq';
import { getRedis } from './redis';
import { logger } from './error-logger';
import { validateTargetUrl } from './url-validation';
import { executeScan } from './scan-executor';

let scanQueue: Queue | null = null;
let scanWorker: Worker | null = null;

const connection = {
  connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
};

export function getScanQueue(): Queue {
  if (!scanQueue) {
    scanQueue = new Queue('scans', {
      ...connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    logger.info('Scan queue initialized');
  }
  return scanQueue;
}

export async function enqueueScan(projectId: string, url: string, userId: string, options?: {
  useBrowser?: boolean;
  html?: string;
  priority?: number;
}): Promise<string> {
  const queue = getScanQueue();
  const urlCheck = await validateTargetUrl(url);
  if (!urlCheck.ok) {
    logger.warn({ projectId, url, error: urlCheck.error }, 'Scan not enqueued — blocked target');
    throw new Error(`Blocked target: ${urlCheck.error}`);
  }
  const job = await queue.add('execute-scan', {
    projectId,
    url: urlCheck.url || url,
    userId,
    useBrowser: options?.useBrowser ?? true,
    html: options?.html,
    createdAt: new Date().toISOString(),
  }, {
    priority: options?.priority ?? 0,
    jobId: `scan:${projectId}:${Date.now()}`,
  });
  logger.info({ projectId, jobId: job.id }, 'Scan enqueued');
  return job.id ?? '';
}

export function startScanWorker() {
  if (scanWorker) return;

  const redis = getRedis();
  if (!redis) {
    logger.warn('Redis not available — scan worker not started');
    return;
  }

  scanWorker = new Worker('scans', async (job: Job) => {
    const { projectId, url, useBrowser, html } = job.data;
    logger.info({ jobId: job.id, projectId }, 'Processing scan job');

    const result = await executeScan({
      projectId,
      url,
      userId: job.data.userId,
      useBrowser: useBrowser ?? true,
      html,
      enforcePlanLimits: true,
      sendNotifications: true,
    });

    if (!result.success) {
      throw new Error(result.errorMessage ?? 'Scan failed');
    }

    logger.info({ jobId: job.id, scanId: result.scanId, violations: result.violationsFound }, 'Scan job completed');
  }, {
    ...connection,
    concurrency: 3,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  });

  scanWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Scan worker completed');
  });

  scanWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Scan worker job failed');
  });

  scanWorker.on('error', (err) => {
    logger.error({ err }, 'Scan worker error');
  });

  logger.info('Scan worker started');
}

export async function getQueueStatus() {
  const queue = getScanQueue();
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

export async function closeQueue() {
  await scanWorker?.close();
  await scanQueue?.close();
  scanWorker = null;
  scanQueue = null;
}
