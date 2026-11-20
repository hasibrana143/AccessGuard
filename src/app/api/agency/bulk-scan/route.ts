import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { z } from 'zod';
import { enqueueScan } from '@/lib/queue';

const bulkScanSchema = z.object({
  projectIds: z.array(z.string()).min(1).max(50),
  priority: z.enum(['normal', 'high']).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.RUN_SCANS)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = bulkScanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { projectIds, priority } = parsed.data;

    // Verify all projects belong to org and are active
    const projects = await db.project.findMany({
      where: { id: { in: projectIds }, orgId, isActive: true },
      select: { id: true, url: true, name: true, crawlConfig: true },
    });

    if (projects.length !== projectIds.length) {
      return NextResponse.json({ error: 'Some projects not found or inactive' }, { status: 400 });
    }

    // Enqueue scans
    const jobIds: string[] = [];
    for (const project of projects) {
      const jobId = await enqueueScan(project.id, project.url, user.id, {
        useBrowser: true,
      });
      jobIds.push(jobId);
    }

    return NextResponse.json({
      success: true,
      queued: jobIds.length,
      jobIds,
      priority: priority || 'normal',
    });
  } catch (error) {
    logger.error({ err: error, orgId }, 'Bulk scan failed');
    return NextResponse.json({ error: 'Failed to queue bulk scan' }, { status: 500 });
  }
}