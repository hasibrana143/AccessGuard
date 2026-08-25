import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRedis } from '@/lib/redis';
import { logger } from '@/lib/error-logger';

const startedAt = Date.now();
const PING_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'connected';
  } catch (error) {
    healthy = false;
    checks.database = 'disconnected';
    logger.error({ err: error }, 'Health check failed: database unreachable');
  }

  const redis = getRedis();
  if (!redis) {
    checks.redis = 'disabled';
  } else {
    try {
      await withTimeout(redis.ping(), PING_TIMEOUT_MS);
      checks.redis = 'connected';
    } catch {
      healthy = false;
      checks.redis = 'unreachable';
      logger.error('Health check failed: redis unreachable');
    }
  }

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      version: process.env.APP_VERSION ?? 'dev',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
