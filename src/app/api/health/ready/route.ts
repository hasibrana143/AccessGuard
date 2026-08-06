import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isRedisReady } from '@/lib/redis';
import { logger } from '@/lib/error-logger';

// Readiness probe (docs/devops/KUBERNETES.md): DB + Redis reachable.
export async function GET() {
  const checks: Record<string, 'up' | 'down' | 'not-configured'> = {};
  let ready = true;

  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'up';
  } catch {
    checks.database = 'down';
    ready = false;
  }

  if (process.env.REDIS_URL) {
    checks.redis = isRedisReady() ? 'up' : 'down';
    if (checks.redis === 'down') ready = false;
  } else {
    checks.redis = 'not-configured';
  }

  if (!ready) {
    logger.warn({ checks }, 'Readiness probe failed');
    return NextResponse.json(
      { status: 'not_ready', checks, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'ready',
    checks,
    timestamp: new Date().toISOString(),
  });
}