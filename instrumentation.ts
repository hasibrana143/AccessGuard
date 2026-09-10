export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Split mode: web serves traffic only; scans run on dedicated worker
    // processes (`npm run worker`). See docs/devops/SCALING.md.
    if (process.env.DISABLE_BACKGROUND_WORKERS === 'true') return;
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
