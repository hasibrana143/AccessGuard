import { Queue, Worker } from 'bullmq';
import { getRedis } from './redis';
import { enqueueScan } from './queue';
import { db } from './db';
import { logger } from './error-logger';
import { getNextRunForSchedule } from './cron';

const TICK_INTERVAL_MS = 60 * 1000;
const TICK_JOB_ID = 'scheduler-tick';

let schedulerQueue: Queue | null = null;
let schedulerWorker: Worker | null = null;
let repeatRegistered = false;

function getSchedulerQueue(): Queue {
  if (!schedulerQueue) {
    schedulerQueue = new Queue('scheduler', {
      connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
    });
  }
  return schedulerQueue;
}

function getNextRunForFrequency(frequency: string, from: Date): Date {
  switch (frequency) {
    case 'daily':
      return new Date(from.getTime() + 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
    case 'weekly':
    default:
      return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

async function getOrgUserId(orgId: string): Promise<string> {
  return db.user.findFirst({ where: { orgId } }).then((user) => user?.id ?? 'scheduler');
}

export async function processDueScheduledScans(): Promise<number> {
  const now = new Date();
  let processed = 0;

  // 1. Recurring ScheduledScan rows that are due
  const dueSchedules = await db.scheduledScan.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: {
      project: { select: { id: true, url: true, orgId: true, isActive: true } },
    },
  });

  for (const schedule of dueSchedules) {
    try {
      if (!schedule.project.isActive) {
        await db.scheduledScan.update({
          where: { id: schedule.id },
          data: { isActive: false },
        });
        continue;
      }

      const nextRunAt = getNextRunForSchedule(schedule, now);
      if (!nextRunAt) {
        logger.warn({ scheduleId: schedule.id }, 'Could not compute next run — disabling schedule');
        await db.scheduledScan.update({
          where: { id: schedule.id },
          data: { isActive: false },
        });
        continue;
      }

      // Atomic claim: only one daemon instance may process this due schedule.
      const claim = await db.scheduledScan.updateMany({
        where: { id: schedule.id, isActive: true, nextRunAt: { lte: now } },
        data: { lastRunAt: now, nextRunAt },
      });
      if (claim.count !== 1) continue; // already claimed by another tick/instance

      const userId = await getOrgUserId(schedule.project.orgId);
      await enqueueScan(schedule.project.id, schedule.project.url, userId);

      await db.project.update({
        where: { id: schedule.project.id },
        data: { nextScheduledScan: nextRunAt },
      });

      await db.auditLog.create({
        data: {
          orgId: schedule.project.orgId,
          action: 'scan_scheduled_triggered',
          metadata: JSON.stringify({
            projectId: schedule.project.id,
            scheduleId: schedule.id,
            frequency: schedule.frequency,
          }),
        },
      });

      processed++;
    } catch (err) {
      logger.error({ err, scheduleId: schedule.id }, 'Failed to process due scheduled scan');
    }
  }

  // 2. One-off project.nextScheduledScan entries that are due
  const dueProjects = await db.project.findMany({
    where: { isActive: true, nextScheduledScan: { lte: now } },
    select: { id: true, url: true, orgId: true },
  });

  for (const project of dueProjects) {
    try {
      // Atomic claim: clear the one-off slot before enqueueing.
      const claim = await db.project.updateMany({
        where: { id: project.id, nextScheduledScan: { lte: now } },
        data: { nextScheduledScan: null },
      });
      if (claim.count !== 1) continue;

      const userId = await getOrgUserId(project.orgId);
      await enqueueScan(project.id, project.url, userId);

      processed++;
    } catch (err) {
      logger.error({ err, projectId: project.id }, 'Failed to process due project scan');
    }
  }

  if (processed > 0) {
    logger.info({ processed }, 'Scheduler daemon triggered scans');
  }
  return processed;
}

export function startSchedulerDaemon() {
  const redis = getRedis();
  if (!redis) {
    logger.warn('Redis not available — scheduler daemon not started');
    return;
  }

  const queue = getSchedulerQueue();

  if (!repeatRegistered) {
    repeatRegistered = true;
    queue
      .add(
        TICK_JOB_ID,
        { type: 'tick' },
        { repeat: { every: TICK_INTERVAL_MS }, jobId: TICK_JOB_ID, removeOnComplete: 100 }
      )
      .then(() => logger.info('Scheduler daemon tick registered'))
      .catch((err) => logger.error({ err }, 'Failed to register scheduler tick'));
  }

  if (schedulerWorker) return;

  schedulerWorker = new Worker(
    'scheduler',
    async () => {
      await processDueScheduledScans();
    },
    {
      connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
      concurrency: 1,
    }
  );

  schedulerWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Scheduler daemon tick failed');
  });

  schedulerWorker.on('error', (err) => {
    logger.error({ err }, 'Scheduler daemon worker error');
  });

  logger.info('Scheduler daemon started');
}
