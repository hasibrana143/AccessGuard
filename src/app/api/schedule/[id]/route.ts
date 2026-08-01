import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCronDescription, getNextRunTime, validateCronExpression } from '@/lib/scheduler';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/schedule/[id] - Get a specific scheduled scan
export async function GET(request: NextRequest, { params }: RouteParams) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`schedule-id-get:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { id } = await params;

    const scheduledScan = await db.scheduledScan.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            url: true,
            isActive: true,
            lastScanAt: true,
            riskScore: true,
          },
        },
      },
    });

    if (!scheduledScan) {
      return NextResponse.json(
        { success: false, error: 'Scheduled scan not found' },
        { status: 404 }
      );
    }

    // Get recent scans for this project
    const recentScans = await db.scan.findMany({
      where: { projectId: scheduledScan.projectId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        violationsFound: true,
        pagesScanned: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...scheduledScan,
        description: getCronDescription(scheduledScan.cron),
        recentScans,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduled scan' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedule/[id] - Delete a scheduled scan
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`schedule-id-delete:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { id } = await params;

    const scheduledScan = await db.scheduledScan.findUnique({
      where: { id },
    });

    if (!scheduledScan) {
      return NextResponse.json(
        { success: false, error: 'Scheduled scan not found' },
        { status: 404 }
      );
    }

    // Delete the scheduled scan
    await db.scheduledScan.delete({
      where: { id },
    });

    // Update project's next scheduled scan time to null
    await db.project.update({
      where: { id: scheduledScan.projectId },
      data: { nextScheduledScan: null },
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled scan deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to delete scheduled scan' },
      { status: 500 }
    );
  }
}

// PATCH /api/schedule/[id] - Update a scheduled scan
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`schedule-id-patch:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { cron, enabled } = body;

    const scheduledScan = await db.scheduledScan.findUnique({
      where: { id },
    });

    if (!scheduledScan) {
      return NextResponse.json(
        { success: false, error: 'Scheduled scan not found' },
        { status: 404 }
      );
    }

    // Validate cron expression if provided
    if (cron) {
      const cronValidation = validateCronExpression(cron);
      if (!cronValidation) {
        return NextResponse.json(
          { success: false, error: 'Invalid cron expression' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (cron !== undefined) {
      updateData.cron = cron;
      updateData.nextRunAt = getNextRunTime(cron);
    }
    if (enabled !== undefined) {
      updateData.enabled = enabled;
    }

    // Update the scheduled scan
    const updatedScan = await db.scheduledScan.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    // Update project's next scheduled scan time
    if (updateData.nextRunAt && enabled !== false) {
      await db.project.update({
        where: { id: scheduledScan.projectId },
        data: { nextScheduledScan: updateData.nextRunAt },
      });
    } else if (enabled === false) {
      await db.project.update({
        where: { id: scheduledScan.projectId },
        data: { nextScheduledScan: null },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedScan,
        description: getCronDescription(updatedScan.cron),
      },
      message: 'Scheduled scan updated successfully',
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to update scheduled scan' },
      { status: 500 }
    );
  }
}
