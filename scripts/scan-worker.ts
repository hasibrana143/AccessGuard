// Dedicated scan-worker process: runs the BullMQ scan worker + scheduler
// daemon WITHOUT the Next.js web server, so browser-scan load never
// competes with web traffic. Scale horizontally:
//
//   docker compose up --scale worker=3        # 3 worker processes
//   SCAN_WORKER_CONCURRENCY=6 npm run worker  # 6 slots per process
//
// Env required: DATABASE_URL, REDIS_URL (see .env.example).
// The web service sets DISABLE_BACKGROUND_WORKERS=true in split mode.

import { startScanWorker, closeQueue } from '../src/lib/queue';
import { logger } from '../src/lib/error-logger';

async function main() {
  // Lazy import: scheduler-daemon pulls BullMQ queue setup at module load.
  const { startSchedulerDaemon } = await import('../src/lib/scheduler-daemon');
  startScanWorker();
  startSchedulerDaemon();
  logger.info(
    { concurrency: process.env.SCAN_WORKER_CONCURRENCY ?? 3 },
    'Standalone scan worker running (SIGTERM to stop)'
  );

  const shutdown = async () => {
    logger.info('Scan worker shutting down');
    await closeQueue();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Park the event loop; BullMQ workers run on Redis blocking connections.
  await new Promise(() => {});
}

main().catch((err) => {
  logger.error({ err }, 'Scan worker failed to start');
  process.exit(1);
});
