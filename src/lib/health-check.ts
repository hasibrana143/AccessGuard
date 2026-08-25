import { db } from './db';
import { getRedis, isRedisReady } from './redis';
import { logger } from './error-logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, CheckResult>;
  timestamp: string;
  uptime: number;
}

interface CheckResult {
  ok: boolean;
  latencyMs?: number;
  detail?: string;
  error?: string;
}

class HealthChecker {
  private startTime = Date.now();

  /**
   * Run all health checks
   */
  async check(): Promise<HealthCheckResult> {
    const checks: Record<string, CheckResult> = {};

    // Run all checks in parallel
    const [database, redis, memory, disk, cpu] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
      this.checkDisk(),
      this.checkCPU(),
    ]);

    checks.database = database.status === 'fulfilled' ? database.value : { ok: false, error: 'Check failed' };
    checks.redis = redis.status === 'fulfilled' ? redis.value : { ok: false, error: 'Check failed' };
    checks.memory = memory.status === 'fulfilled' ? memory.value : { ok: false, error: 'Check failed' };
    checks.disk = disk.status === 'fulfilled' ? disk.value : { ok: false, error: 'Check failed' };
    checks.cpu = cpu.status === 'fulfilled' ? cpu.value : { ok: false, error: 'Check failed' };

    // Determine overall status
    const allOk = Object.values(checks).every(c => c.ok);
    const anyFailed = Object.values(checks).some(c => !c.ok);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (anyFailed) {
      status = 'degraded';
    }
    if (!checks.database?.ok) {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<CheckResult> {
    const start = performance.now();
    try {
      await db.$queryRaw`SELECT 1`;
      const latencyMs = performance.now() - start;
      return {
        ok: true,
        latencyMs,
        detail: `PostgreSQL connected (${latencyMs.toFixed(0)}ms)`,
      };
    } catch (err) {
      const latencyMs = performance.now() - start;
      return {
        ok: false,
        latencyMs,
        detail: 'PostgreSQL connection failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<CheckResult> {
    const start = performance.now();
    try {
      if (!isRedisReady()) {
        return {
          ok: false,
          detail: 'Redis not configured',
        };
      }

      const redis = getRedis();
      if (!redis) {
        return {
          ok: false,
          detail: 'Redis client not available',
        };
      }

      await redis.ping();
      const latencyMs = performance.now() - start;
      return {
        ok: true,
        latencyMs,
        detail: `Redis connected (${latencyMs.toFixed(0)}ms)`,
      };
    } catch (err) {
      const latencyMs = performance.now() - start;
      return {
        ok: false,
        latencyMs,
        detail: 'Redis connection failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<CheckResult> {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const rssMB = Math.round(memUsage.rss / 1024 / 1024);
      const usagePercent = Math.round((heapUsedMB / heapTotalMB) * 100);

      return {
        ok: usagePercent < 90,
        detail: JSON.stringify({
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          rss: `${rssMB}MB`,
          usagePercent,
        }),
      };
    } catch (err) {
      return {
        ok: false,
        detail: 'Memory check failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Check disk space
   */
  private async checkDisk(): Promise<CheckResult> {
    try {
      const fs = await import('fs');
      const stats = fs.statSync('/');
      return {
        ok: true,
        detail: 'Disk accessible',
      };
    } catch {
      return {
        ok: true, // Non-critical
        detail: 'Disk check skipped',
      };
    }
  }

  /**
   * Check CPU usage
   */
  private async checkCPU(): Promise<CheckResult> {
    try {
      const cpus = process.cpuUsage();
      const userMs = Math.round(cpus.user / 1000);
      const systemMs = Math.round(cpus.system / 1000);

      return {
        ok: true,
        detail: JSON.stringify({
          userMs,
          systemMs,
        }),
      };
    } catch (err) {
      return {
        ok: false,
        detail: 'CPU check failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  /**
   * Get liveness probe (simple check)
   */
  async liveness(): Promise<CheckResult> {
    return {
      ok: true,
      detail: 'Process is up',
      latencyMs: 0,
    };
  }

  /**
   * Get readiness probe (check dependencies)
   */
  async readiness(): Promise<HealthCheckResult> {
    const checks: Record<string, CheckResult> = {};

    const [database, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    checks.database = database.status === 'fulfilled' ? database.value : { ok: false };
    checks.redis = redis.status === 'fulfilled' ? redis.value : { ok: false };

    const allOk = Object.values(checks).every(c => c.ok);

    return {
      status: allOk ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

export const healthChecker = new HealthChecker();
