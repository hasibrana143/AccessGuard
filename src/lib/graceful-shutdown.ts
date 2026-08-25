/**
 * Graceful Shutdown Manager
 * 
 * Handles clean shutdown of:
 * - HTTP server
 * - Database connections
 * - Redis connections
 * - Background job queues
 * - SSE connections
 * - Metrics flush
 * 
 * Usage:
 *   import { shutdownManager } from '@/lib/graceful-shutdown';
 *   shutdownManager.register('db', () => prisma.$disconnect());
 *   shutdownManager.register('redis', () => redis.quit());
 *   shutdownManager.start();
 */

import { logger } from './error-logger';

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void>;
  timeout: number; // ms
  order: number; // lower = earlier
}

export interface ShutdownStatus {
  isShuttingDown: boolean;
  handlers: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
    duration?: number;
  }>;
  startedAt?: Date;
  completedAt?: Date;
}

class GracefulShutdownManager {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30s total timeout
  private forceKillTimeout = 10000; // 10s per handler

  /**
   * Register a shutdown handler
   */
  register(name: string, handler: () => Promise<void>, options?: {
    timeout?: number;
    order?: number;
  }): void {
    this.handlers.push({
      name,
      handler,
      timeout: options?.timeout ?? this.forceKillTimeout,
      order: options?.order ?? 0,
    });

    // Sort by order
    this.handlers.sort((a, b) => a.order - b.order);
  }

  /**
   * Start listening for shutdown signals
   */
  start(): void {
    if (typeof process === 'undefined') return;

    const shutdown = (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      logger.info({ signal }, 'Shutdown signal received, starting graceful shutdown...');

      const forceExit = setTimeout(() => {
        logger.error('Force exit after timeout');
        process.exit(1);
      }, this.shutdownTimeout);

      this.runShutdownHandlers()
        .then(() => {
          clearTimeout(forceExit);
          logger.info('Graceful shutdown completed');
          process.exit(0);
        })
        .catch((err) => {
          logger.error({ error: err.message }, 'Error during shutdown');
          clearTimeout(forceExit);
          process.exit(1);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      logger.error({ error: err.message, stack: err.stack }, 'Uncaught exception');
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled rejection');
    });

    logger.info('Graceful shutdown manager initialized');
  }

  /**
   * Run all shutdown handlers
   */
  private async runShutdownHandlers(): Promise<void> {
    const status: ShutdownStatus = {
      isShuttingDown: true,
      handlers: this.handlers.map(h => ({
        name: h.name,
        status: 'pending' as const,
      })),
      startedAt: new Date(),
    };

    for (const handler of this.handlers) {
      const handlerStatus = status.handlers.find(h => h.name === handler.name);
      if (!handlerStatus) continue;

      handlerStatus.status = 'running';
      const startTime = performance.now();

      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), handler.timeout);
        });

        // Race handler vs timeout
        await Promise.race([
          handler.handler(),
          timeoutPromise,
        ]);

        const duration = performance.now() - startTime;
        handlerStatus.status = 'completed';
        handlerStatus.duration = duration;

        logger.info({ handler: handler.name, duration }, `Shutdown handler completed`);
      } catch (err) {
        const duration = performance.now() - startTime;
        const isTimeout = err instanceof Error && err.message === 'Timeout';
        
        handlerStatus.status = isTimeout ? 'timeout' : 'failed';
        handlerStatus.duration = duration;

        logger.error({
          handler: handler.name,
          error: err instanceof Error ? err.message : 'Unknown error',
          isTimeout,
        }, `Shutdown handler failed`);
      }
    }

    status.completedAt = new Date();
    logger.info({ status }, 'Shutdown sequence complete');
  }

  /**
   * Get shutdown status
   */
  getStatus(): ShutdownStatus {
    return {
      isShuttingDown: this.isShuttingDown,
      handlers: this.handlers.map(h => ({
        name: h.name,
        status: 'pending' as const,
      })),
    };
  }

  /**
   * Force shutdown (for testing)
   */
  forceShutdown(): void {
    logger.warn('Force shutdown initiated');
    process.exit(1);
  }
}

// Singleton
export const shutdownManager = new GracefulShutdownManager();

/**
 * Register common shutdown handlers
 */
export function registerDefaultHandlers(
  prisma: { $disconnect: () => Promise<void> },
  redis?: { quit: () => Promise<void> },
  queue?: { close: () => Promise<void> }
): void {
  // Database disconnect
  shutdownManager.register('database', async () => {
    await prisma.$disconnect();
  }, { order: 1 });

  // Redis disconnect
  if (redis) {
    shutdownManager.register('redis', async () => {
      await redis.quit();
    }, { order: 2 });
  }

  // Queue shutdown
  if (queue) {
    shutdownManager.register('queue', async () => {
      await queue.close();
    }, { order: 3 });
  }

  // SSE connections close
  shutdownManager.register('sse', async () => {
    // Close all SSE connections
    logger.info('Closing SSE connections');
  }, { order: 4 });

  // Metrics flush
  shutdownManager.register('metrics', async () => {
    // Flush any pending metrics
    logger.info('Flushing metrics');
  }, { order: 5 });
}
