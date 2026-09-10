import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      service: 'AccessGuard API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch {
    // Generic message on purpose: raw DB error text can leak connection details.
    return NextResponse.json({
      status: 'unhealthy',
      service: 'AccessGuard API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    }, { status: 503 });
  }
}
