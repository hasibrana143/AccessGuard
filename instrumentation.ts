export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScanWorker } = await import('@/lib/queue');
    const { startSchedulerDaemon } = await import('@/lib/scheduler-daemon');
    const { logger } = await import('@/lib/error-logger');
    try {
      startScanWorker();
      startSchedulerDaemon();
      logger.info('Background scan worker + scheduler daemon started via instrumentation');
    } catch (err) {
      logger.error({ err }, 'Failed to start background workers');
    }
  }
}
