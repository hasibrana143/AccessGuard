import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';
import { requireAuth, requireProjectAccess } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { isValidCron, getNextRun } from '@/lib/cron';

// GET /api/schedule - Get scheduled scans
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`schedule-get:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const orgParam = searchParams.get('orgId');

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    // Get projects with scheduled scans
    const projects = await db.project.findMany({
      where: {
        organization: { id: auth.user.orgId },
        nextScheduledScan: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        url: true,
        nextScheduledScan: true,
        lastScanAt: true,
        riskScore: true,
        organization: {
          select: { name: true },
        },
      },
      orderBy: { nextScheduledScan: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduled scans' },
      { status: 500 }
    );
  }
}

// POST /api/schedule - Schedule a scan
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`schedule-post:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { projectId, schedule, cron } = body; // schedule: 'daily', 'weekly', 'monthly', ISO date, or cron expression

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const access = await requireProjectAccess(request, projectId, { permission: PERMISSIONS.MANAGE_SCHEDULES });
    if (access instanceof NextResponse) return access;

    // Calculate next scan time
    let nextScan: Date;
    let cronExpr = '';
    const now = new Date();

    if (cron && typeof cron === 'string') {
      if (!isValidCron(cron)) {
        return NextResponse.json(
          { success: false, error: 'Invalid cron expression. Expected 5 fields: minute hour day-of-month month day-of-week' },
          { status: 400 }
        );
      }
      const next = getNextRun(cron, now);
      if (!next) {
        return NextResponse.json(
          { success: false, error: 'Cron expression has no upcoming run' },
          { status: 400 }
        );
      }
      nextScan = next;
      cronExpr = cron;
    } else {
      switch (schedule) {
        case 'daily':
          nextScan = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          nextScan = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          nextScan = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          // Try to parse as ISO date
          nextScan = new Date(schedule);
          if (isNaN(nextScan.getTime())) {
            return NextResponse.json(
              { success: false, error: 'Invalid schedule' },
              { status: 400 }
            );
          }
      }
    }

    // Update project with scheduled scan
    const project = await db.project.update({
      where: { id: projectId },
      data: { nextScheduledScan: nextScan },
      include: {
        organization: true,
      },
    });

    // Maintain recurring ScheduledScan row for the daemon (cron-aware)
    if (cronExpr || schedule === 'daily' || schedule === 'weekly' || schedule === 'monthly') {
      const frequency = schedule === 'daily' || schedule === 'weekly' || schedule === 'monthly' ? schedule : 'weekly';
      await db.scheduledScan.upsert({
        where: { projectId },
        create: { projectId, frequency, cron: cronExpr || defaultCronForFrequency(frequency), nextRunAt: nextScan },
        update: { frequency, cron: cronExpr || defaultCronForFrequency(frequency), nextRunAt: nextScan, isActive: true },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId: project.orgId,
        action: 'scan_scheduled',
        metadata: JSON.stringify({
          projectId,
          projectName: project.name,
          schedule,
          cron: cronExpr || null,
          nextScan: nextScan.toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        nextScheduledScan: nextScan,
        schedule,
        cron: cronExpr || null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to schedule scan' },
      { status: 500 }
    );
  }
}

function defaultCronForFrequency(frequency: string): string {
  switch (frequency) {
    case 'daily':
      return '0 2 * * *';
    case 'monthly':
      return '0 2 1 * *';
    case 'weekly':
    default:
      return '0 2 * * 1';
  }
}

// DELETE /api/schedule - Cancel scheduled scan
export async function DELETE(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`schedule-delete:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const access = await requireProjectAccess(request, projectId, { permission: PERMISSIONS.MANAGE_SCHEDULES });
    if (access instanceof NextResponse) return access;

    const project = await db.project.update({
      where: { id: projectId },
      data: { nextScheduledScan: null },
    });

    await db.scheduledScan.updateMany({
      where: { projectId },
      data: { isActive: false },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId: project.orgId,
        action: 'scan_unscheduled',
        metadata: JSON.stringify({
          projectId,
          projectName: project.name,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled scan cancelled',
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to cancel scheduled scan' },
      { status: 500 }
    );
  }
}
