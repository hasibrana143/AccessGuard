import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireAuth } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLL_INTERVAL_MS = 3000;
const MAX_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const encoder = new TextEncoder();
  const startTime = Date.now();

  let lastViolationCount = 0;

  // Get initial count
  try {
    lastViolationCount = await db.violation.count({
      where: { project: { orgId: auth.user.orgId } },
    });
  } catch {
    // Use default
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({ type: 'connected', orgId: auth.user.orgId });

      while (!closed) {
        if (Date.now() - startTime > MAX_DURATION_MS) {
          send({ type: 'error', message: 'SSE timeout exceeded' });
          break;
        }

        try {
          const violationCount = await db.violation.count({
            where: { project: { orgId: auth.user.orgId } },
          });

          // Check for new violations
          if (violationCount > lastViolationCount) {
            const newViolations = await db.violation.findMany({
              where: { project: { orgId: auth.user.orgId } },
              orderBy: { createdAt: 'desc' },
              take: violationCount - lastViolationCount,
              select: {
                id: true,
                ruleId: true,
                severity: true,
                description: true,
                status: true,
                url: true,
                createdAt: true,
                project: { select: { name: true } },
              },
            });

            for (const violation of newViolations) {
              send({ type: 'new_violation', violation });
            }
            lastViolationCount = violationCount;
          }
        } catch (err) {
          logger.error({ err, orgId: auth.user.orgId }, 'Violations SSE error');
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      try {
        controller.close();
      } catch {
        // ignore
      }
    },
  });

  request.signal.addEventListener('abort', () => {
    logger.info({ orgId: auth.user.orgId }, 'Violations SSE client disconnected');
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
