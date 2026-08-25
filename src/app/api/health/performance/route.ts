import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const startTime = Date.now();

/**
 * GET /api/health/performance
 * Returns comprehensive performance metrics: DB latency, Redis status,
 * memory usage, process uptime, and system load.
 * No auth required — used for internal monitoring.
 */
export async function GET() {
  const requestId = crypto.randomUUID();
  const checks: Record<string, { ok: boolean; latencyMs?: number; detail?: string }> = {};

  // 1. Database latency check
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = {
      ok: true,
      latencyMs: Date.now() - dbStart,
      detail: 'PostgreSQL connected',
    };
  } catch (err) {
    checks.database = {
      ok: false,
      latencyMs: Date.now() - dbStart,
      detail: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  // 2. Redis check (best-effort)
  try {
    const redisStart = Date.now();
    // Dynamic import to avoid crash if Redis is unavailable
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      connectTimeout: 3000,
      maxRetriesPerRequest: 0,
      lazyConnect: true,
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    checks.redis = {
      ok: true,
      latencyMs: Date.now() - redisStart,
      detail: 'Redis connected',
    };
  } catch (err) {
    checks.redis = {
      ok: false,
      detail: err instanceof Error ? err.message : 'Redis unavailable',
    };
  }

  // 3. Memory usage
  const mem = process.memoryUsage();
  checks.memory = {
    ok: mem.heapUsed / mem.heapTotal < 0.9,
    detail: JSON.stringify({
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      external: `${Math.round(mem.external / 1024 / 1024)}MB`,
      usagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
    }),
  };

  // 4. Process uptime
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  checks.uptime = {
    ok: true,
    detail: JSON.stringify({
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds),
      nodeVersion: process.version,
      pid: process.pid,
    }),
  };

  // 5. CPU load
  const cpus = process.cpuUsage();
  checks.cpu = {
    ok: true,
    detail: JSON.stringify({
      userMs: Math.round(cpus.user / 1000),
      systemMs: Math.round(cpus.system / 1000),
      loadAvg: typeof require !== 'undefined' ? undefined : undefined,
    }),
  };

  // Overall status
  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      success: true,
      data: {
        status: allOk ? 'healthy' : 'degraded',
        checks,
        uptime: uptimeSeconds,
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        'X-Request-ID': requestId,
        'Cache-Control': 'no-store',
      },
    }
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}
