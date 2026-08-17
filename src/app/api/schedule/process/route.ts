import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSchedulerApiKey } from '@/lib/scheduler';
import { executeScan } from '@/lib/scan-executor';
import { logger } from '@/lib/error-logger';

/**
 * Internal endpoint for the scheduler service to trigger scans.
 * This endpoint is protected by an API key and should only be called
 * by the scheduler service.
 */

// POST /api/schedule/process - Trigger a scan for a project
export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('X-Scheduler-Api-Key');
    const validApiKey = getSchedulerApiKey();

    if (!validApiKey) {
      return NextResponse.json(
        { success: false, error: 'Scheduler not configured' },
        { status: 503 }
      );
    }
    if (!apiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Find a user in the org to attribute the scan to
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, url: true, orgId: true, isActive: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.isActive) {
      return NextResponse.json(
        { success: false, error: 'Project is inactive' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(project.url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid project URL' },
        { status: 400 }
      );
    }

    // Find a user in the org (fallback to first user, or use a system user)
    const user = await db.user.findFirst({
      where: { orgId: project.orgId },
      select: { id: true },
    });
    const userId = user?.id ?? 'scheduler';

    logger.info(`[Scheduler] Starting scan for project: ${project.name} (${project.url})`);

    // Execute scan using shared logic (enforces plan limits, sends notifications)
    const result = await executeScan({
      projectId: project.id,
      url: project.url,
      userId,
      useBrowser: true,
      enforcePlanLimits: true,
      sendNotifications: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.errorMessage ?? 'Scan failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        scanId: result.scanId,
        status: 'completed',
        violationsFound: result.violationsFound,
        pagesScanned: result.pagesScanned,
        severityCounts: result.severityCounts,
        riskScore: result.riskScore,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to process scheduled scan' },
      { status: 500 }
    );
  }
}

// GET /api/schedule/process - Health check for scheduler
export async function GET(request: NextRequest) {
  // Verify API key for health check too
  const apiKey = request.headers.get('X-Scheduler-Api-Key');
  const validApiKey = getSchedulerApiKey();

  if (!validApiKey) {
    return NextResponse.json(
      { success: false, error: 'Scheduler not configured' },
      { status: 503 }
    );
  }
  if (!apiKey || apiKey !== validApiKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Scheduler process endpoint is healthy',
    timestamp: new Date().toISOString(),
  });
}