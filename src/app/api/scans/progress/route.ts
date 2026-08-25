import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireScanAccess } from '@/lib/rbac';
import { getRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 minutes max

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');
  const requestId = getRequestId(request);

  if (!scanId) {
    return new Response(JSON.stringify({ error: 'scanId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
    });
  }

  // Verify the scan belongs to a project in the user's org before streaming progress
  const access = await requireScanAccess(request, scanId);
  if (access instanceof NextResponse) {
    return new Response(JSON.stringify({ error: access.headers.get('x-error') || 'Forbidden' }), {
      status: access.status,
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
    });
  }

  const encoder = new TextEncoder();
  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      let lastStatus = '';
      let lastPages = -1;
      let lastViolations = -1;
      let closed = false;

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      send({ type: 'connected', scanId, requestId });

      while (!closed) {
        // Timeout check
        if (Date.now() - startTime > MAX_POLL_DURATION_MS) {
          send({ type: 'error', message: 'Scan progress timeout exceeded' });
          break;
        }

        try {
          const scan = await db.scan.findUnique({
            where: { id: scanId },
            select: {
              status: true,
              pagesScanned: true,
              violationsFound: true,
              errorMessage: true,
              completedAt: true,
              summary: true,
            },
          });

          if (!scan) {
            send({ type: 'error', message: 'Scan not found' });
            break;
          }

          const changed = scan.status !== lastStatus ||
            scan.pagesScanned !== lastPages ||
            scan.violationsFound !== lastViolations;

          if (changed) {
            lastStatus = scan.status;
            lastPages = scan.pagesScanned;
            lastViolations = scan.violationsFound;

            send({
              type: 'progress',
              status: scan.status,
              pagesScanned: scan.pagesScanned,
              violationsFound: scan.violationsFound,
              errorMessage: scan.errorMessage,
              summary: scan.summary ? JSON.parse(scan.summary) : null,
            });
          }

          if (scan.status === 'completed' || scan.status === 'failed') {
            send({ type: 'done', status: scan.status, duration: Date.now() - startTime });
            break;
          }
        } catch (err) {
          logger.error({ err, scanId, requestId }, 'SSE poll error');
          send({ type: 'error', message: 'Internal error' });
          break;
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      try { controller.close(); } catch { /* ignore */ }
    },
  });

  request.signal.addEventListener('abort', () => {
    logger.info({ scanId, requestId }, 'SSE client disconnected');
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Request-ID': requestId,
      Connection: 'keep-alive',
    },
  });
}
