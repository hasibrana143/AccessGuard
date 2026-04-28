/**
 * AccessGuard Scheduler Service
 * 
 * A background service that processes scheduled scans at their designated times.
 * Runs independently from the main Next.js application on port 3001.
 */

import { CronExpressionParser } from 'cron-parser';
import { PrismaClient } from '@prisma/client';

// Configuration
const SCHEDULER_PORT = process.env.SCHEDULER_PORT || 3001;
const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY || 'dev-scheduler-api-key';
const MAX_CONCURRENT_SCANS = parseInt(process.env.MAX_CONCURRENT_SCANS || '3', 10);
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

// Prisma client for database access
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Track currently running scans
const runningScans = new Set<string>();

// Logger utility
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: unknown) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, error instanceof Error ? error.message : error);
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, data ? JSON.stringify(data) : '');
  },
};

/**
 * Check if a scheduled scan should run now
 */
function shouldRunScan(cron: string, lastRunAt: Date | null, nextRunAt: Date): boolean {
  const now = new Date();
  
  // Check if it's time to run
  if (now < nextRunAt) {
    return false;
  }
  
  // Avoid running too frequently - minimum 1 minute between runs
  if (lastRunAt) {
    const timeSinceLastRun = now.getTime() - lastRunAt.getTime();
    if (timeSinceLastRun < 60000) {
      return false;
    }
  }
  
  return true;
}

/**
 * Calculate the next run time from a cron expression
 */
function calculateNextRun(cron: string): Date {
  try {
    const interval = CronExpressionParser.parse(cron, {
      currentDate: new Date(),
    });
    const next = interval.next();
    return next.toDate();
  } catch (error) {
    logger.error('Failed to calculate next run time', error);
    // Default to 1 hour from now if parsing fails
    return new Date(Date.now() + 3600000);
  }
}

/**
 * Trigger a scan for a project via the internal API
 */
async function triggerScan(projectId: string): Promise<{ success: boolean; scanId?: string; error?: string }> {
  try {
    // Use the internal process endpoint
    const baseUrl = process.env.INTERNAL_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/schedule/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Scheduler-Api-Key': SCHEDULER_API_KEY,
      },
      body: JSON.stringify({ projectId }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to trigger scan');
    }

    return { success: true, scanId: data.data?.scanId };
  } catch (error) {
    logger.error(`Failed to trigger scan for project ${projectId}`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Process scheduled scans
 */
async function processScheduledScans(): Promise<void> {
  logger.info('Checking for scheduled scans to process...');
  
  try {
    // Get all enabled scheduled scans that are due
    const now = new Date();
    const scheduledScans = await prisma.scheduledScan.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: now,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            url: true,
            isActive: true,
          },
        },
      },
    });

    logger.info(`Found ${scheduledScans.length} scheduled scans due`);

    // Process each scheduled scan
    for (const scheduled of scheduledScans) {
      // Skip if project is inactive
      if (!scheduled.project.isActive) {
        logger.warn(`Skipping scheduled scan for inactive project: ${scheduled.project.name}`);
        continue;
      }

      // Skip if already running
      if (runningScans.has(scheduled.projectId)) {
        logger.info(`Scan already running for project: ${scheduled.project.name}`);
        continue;
      }

      // Check concurrent scan limit
      if (runningScans.size >= MAX_CONCURRENT_SCANS) {
        logger.warn(`Max concurrent scans reached (${MAX_CONCURRENT_SCANS}), skipping ${scheduled.project.name}`);
        continue;
      }

      // Check if should run
      if (!shouldRunScan(scheduled.cron, scheduled.lastRunAt, scheduled.nextRunAt)) {
        continue;
      }

      logger.info(`Triggering scheduled scan for project: ${scheduled.project.name}`, {
        projectId: scheduled.projectId,
        scheduledScanId: scheduled.id,
        cron: scheduled.cron,
      });

      // Mark as running
      runningScans.add(scheduled.projectId);

      try {
        // Trigger the scan
        const result = await triggerScan(scheduled.projectId);

        if (result.success) {
          logger.info(`Scan triggered successfully for project: ${scheduled.project.name}`, {
            scanId: result.scanId,
          });

          // Update scheduled scan with last run time and next run time
          const nextRun = calculateNextRun(scheduled.cron);
          await prisma.scheduledScan.update({
            where: { id: scheduled.id },
            data: {
              lastRunAt: now,
              nextRunAt: nextRun,
            },
          });

          // Update project's next scheduled scan time
          await prisma.project.update({
            where: { id: scheduled.projectId },
            data: { nextScheduledScan: nextRun },
          });

          logger.info(`Updated next run time for project: ${scheduled.project.name}`, {
            nextRunAt: nextRun.toISOString(),
          });
        } else {
          logger.error(`Failed to trigger scan for project: ${scheduled.project.name}`, result.error);
        }
      } finally {
        // Remove from running set
        runningScans.delete(scheduled.projectId);
      }
    }
  } catch (error) {
    logger.error('Error processing scheduled scans', error);
  }
}

/**
 * Start the scheduler service
 */
async function startScheduler(): Promise<void> {
  logger.info('Starting AccessGuard Scheduler Service', {
    port: SCHEDULER_PORT,
    maxConcurrentScans: MAX_CONCURRENT_SCANS,
    checkInterval: `${CHECK_INTERVAL_MS / 1000}s`,
  });

  // Run initial check
  await processScheduledScans();

  // Schedule periodic checks
  setInterval(processScheduledScans, CHECK_INTERVAL_MS);

  logger.info('Scheduler service started successfully');
}

/**
 * Graceful shutdown
 */
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down scheduler service...`);
  
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
});

// Start the scheduler
startScheduler().catch((error) => {
  logger.error('Failed to start scheduler', error);
  process.exit(1);
});
