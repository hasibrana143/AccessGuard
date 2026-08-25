import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireAuth } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLL_INTERVAL_MS = 5000;
const MAX_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const encoder = new TextEncoder();
  const startTime = Date.now();

  let lastScanCount = 0;
  let lastViolationCount = 0;
  let lastProjectCount = 0;

  // Get initial counts
  try {
    const [scanCount, violationCount, projectCount] = await Promise.all([
      db.scan.count({ where: { project: { orgId: auth.user.orgId } } }),
      db.violation.count({ where: { project: { orgId: auth.user.orgId } } }),
      db.project.count({ where: { orgId: auth.user.orgId, isActive: true } }),
    ]);
    lastScanCount = scanCount;
    lastViolationCount = violationCount;
    lastProjectCount = projectCount;
  } catch {
    // Use defaults
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
          const [scanCount, violationCount, projectCount] = await Promise.all([
            db.scan.count({ where: { project: { orgId: auth.user.orgId } } }),
            db.violation.count({ where: { project: { orgId: auth.user.orgId } } }),
            db.project.count({ where: { orgId: auth.user.orgId, isActive: true } }),
          ]);

          // Check for new scans
          if (scanCount > lastScanCount) {
            const newScans = await db.scan.findMany({
              where: { project: { orgId: auth.user.orgId } },
              orderBy: { createdAt: 'desc' },
              take: scanCount - lastScanCount,
              select: {
                id: true,
                status: true,
                pagesScanned: true,
                violationsFound: true,
                createdAt: true,
                project: { select: { name: true } },
              },
            });

            for (const scan of newScans) {
              send({ type: 'scan_complete', data: scan });
            }
            lastScanCount = scanCount;
          }

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
                createdAt: true,
                project: { select: { name: true } },
              },
            });

            for (const violation of newViolations) {
              send({ type: 'violation_found', data: violation });
            }
            lastViolationCount = violationCount;
          }

          // Check for new projects
          if (projectCount > lastProjectCount) {
            const newProjects = await db.project.findMany({
              where: { orgId: auth.user.orgId, isActive: true },
              orderBy: { createdAt: 'desc' },
              take: projectCount - lastProjectCount,
              select: {
                id: true,
                name: true,
                url: true,
                createdAt: true,
              },
            });

            for (const project of newProjects) {
              send({ type: 'project_added', data: project });
            }
            lastProjectCount = projectCount;
          }

          // Send heartbeat every 30 seconds
          if (Date.now() - startTime % 30000 < POLL_INTERVAL_MS) {
            send({ type: 'heartbeat', timestamp: Date.now() });
          }
        } catch (err) {
          logger.error({ err, orgId: auth.user.orgId }, 'Dashboard SSE error');
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
    logger.info({ orgId: auth.user.orgId }, 'Dashboard SSE client disconnected');
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
