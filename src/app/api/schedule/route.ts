import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

// GET /api/schedule - Get scheduled scans
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`schedule-get:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    const where: Record<string, unknown> = {};
    if (orgId) {
      where.organization = { id: orgId };
    }

    // Get projects with scheduled scans
    const projects = await db.project.findMany({
      where: {
        ...where,
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
    console.error('Error fetching scheduled scans:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scheduled scans' },
      { status: 500 }
    );
  }
}

// POST /api/schedule - Schedule a scan
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`schedule-post:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { projectId, schedule } = body; // schedule: 'daily', 'weekly', 'monthly', or ISO date

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Calculate next scan time
    let nextScan: Date;
    const now = new Date();

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

    // Update project with scheduled scan
    const project = await db.project.update({
      where: { id: projectId },
      data: { nextScheduledScan: nextScan },
      include: {
        organization: true,
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId: project.orgId,
        action: 'scan_scheduled',
        metadata: JSON.stringify({
          projectId,
          projectName: project.name,
          schedule,
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
      },
    });
  } catch (error) {
    console.error('Error scheduling scan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to schedule scan' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedule - Cancel scheduled scan
export async function DELETE(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`schedule-delete:${clientId}`, rateLimits.default);
  
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

    const project = await db.project.update({
      where: { id: projectId },
      data: { nextScheduledScan: null },
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
    console.error('Error cancelling scheduled scan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel scheduled scan' },
      { status: 500 }
    );
  }
}
