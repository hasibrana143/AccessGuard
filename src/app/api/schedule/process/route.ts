import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scanUrlServer, type ServerViolation } from '@/services/server-scanner';
import { getSchedulerApiKey } from '@/lib/scheduler';

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

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
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

    console.log(`[Scheduler] Starting scan for project: ${project.name} (${project.url})`);

    // Create a new scan
    const scan = await db.scan.create({
      data: {
        projectId,
        status: 'running',
      },
    });

    try {
      // Run the actual accessibility scan
      const scanResult = await scanUrlServer(project.url);

      if (scanResult.error) {
        throw new Error(scanResult.error);
      }

      // Create violations from scan results
      const violationsToCreate = scanResult.violations.map((v: ServerViolation) => ({
        scanId: scan.id,
        projectId,
        ruleId: v.ruleId,
        wcagCriteria: v.wcagCriteria,
        severity: v.severity,
        url: v.url,
        elementSelector: v.elementSelector,
        elementHtml: v.elementHtml,
        description: v.description,
        remediationCode: v.remediationCode,
        aiExplanation: v.aiExplanation,
        aiConfidenceScore: v.aiConfidenceScore,
        status: 'open' as const,
      }));

      // Insert violations in batches
      if (violationsToCreate.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < violationsToCreate.length; i += batchSize) {
          const batch = violationsToCreate.slice(i, i + batchSize);
          await db.violation.createMany({ data: batch });
        }
      }

      // Calculate summary
      const severityCounts = {
        critical: scanResult.violations.filter((v: ServerViolation) => v.severity === 'critical').length,
        serious: scanResult.violations.filter((v: ServerViolation) => v.severity === 'serious').length,
        moderate: scanResult.violations.filter((v: ServerViolation) => v.severity === 'moderate').length,
        minor: scanResult.violations.filter((v: ServerViolation) => v.severity === 'minor').length,
      };

      // Calculate risk score
      let riskScore = 100;
      riskScore -= severityCounts.critical * 10;
      riskScore -= severityCounts.serious * 5;
      riskScore -= severityCounts.moderate * 2;
      riskScore -= severityCounts.minor * 1;
      riskScore = Math.max(0, Math.min(100, riskScore));

      // Update scan as completed
      await db.scan.update({
        where: { id: scan.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          pagesScanned: scanResult.pagesScanned,
          violationsFound: scanResult.violations.length,
          summary: JSON.stringify(severityCounts),
        },
      });

      // Update project's risk score and last scan time
      await db.project.update({
        where: { id: projectId },
        data: {
          lastScanAt: new Date(),
          riskScore,
        },
      });

      console.log(`[Scheduler] Scan ${scan.id} completed with ${scanResult.violations.length} violations`);

      return NextResponse.json({
        success: true,
        data: {
          scanId: scan.id,
          status: 'completed',
          violationsFound: scanResult.violations.length,
          pagesScanned: scanResult.pagesScanned,
          severityCounts,
          riskScore,
        },
      });
    } catch (scanError) {
      console.error(`[Scheduler] Scan ${scan.id} failed:`, scanError);

      // Sanitize error message
      let errorMessage = 'An unexpected error occurred';
      if (scanError instanceof Error) {
        if (scanError.message.includes('ECONNREFUSED') || scanError.message.includes('ENOTFOUND')) {
          errorMessage = 'Unable to connect to the target URL';
        } else if (scanError.message.includes('timeout')) {
          errorMessage = 'Request timed out';
        }
      }

      // Update scan as failed
      await db.scan.update({
        where: { id: scan.id },
        data: {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: false,
        error: `Scan failed: ${errorMessage}`,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Scheduler] Error processing scheduled scan:', error);
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
