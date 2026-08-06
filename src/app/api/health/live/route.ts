import { NextResponse } from 'next/server';

// Liveness probe (docs/devops/KUBERNETES.md): process up, no dependency checks.
export function GET() {
  return NextResponse.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}