import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scanUrlServer, type ServerViolation } from '@/services/server-scanner';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

// Sanitize error messages for production
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Don't expose internal error details
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return 'Unable to connect to the target URL';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out';
    }
    // Generic error for other cases
    return 'An unexpected error occurred';
  }
  return 'An unexpected error occurred';
}

// GET /api/scans - List scans
export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`scans-get:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const scans = await db.scan.findMany({
      where,
      include: {
        project: {
          select: {
            name: true,
            url: true
          }
        },
        _count: {
          select: { violations: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: scans
    });
  } catch (error) {
    console.error('Error fetching scans:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scans' },
      { status: 500 }
    );
  }
}

// POST /api/scans - Create and execute a scan synchronously
export async function POST(request: NextRequest) {
  // Rate limiting (stricter for scans)
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`scans-post:${clientId}`, rateLimits.scan);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
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
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
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

    // Create a new scan
    const scan = await db.scan.create({
      data: {
        projectId,
        status: 'running'
      }
    });

    console.log(`Starting scan ${scan.id} for ${project.url}`);

    try {
      // Run the actual accessibility scan (synchronous)
      const result = await scanUrlServer(project.url);

      if (result.error) {
        throw new Error(result.error);
      }

      // Create violations from scan results
      const violationsToCreate = result.violations.map((v: ServerViolation) => ({
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
        status: 'open' as const
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
        critical: result.violations.filter((v: ServerViolation) => v.severity === 'critical').length,
        serious: result.violations.filter((v: ServerViolation) => v.severity === 'serious').length,
        moderate: result.violations.filter((v: ServerViolation) => v.severity === 'moderate').length,
        minor: result.violations.filter((v: ServerViolation) => v.severity === 'minor').length,
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
          pagesScanned: result.pagesScanned,
          violationsFound: result.violations.length,
          summary: JSON.stringify(severityCounts)
        }
      });

      // Update project's risk score and last scan time
      await db.project.update({
        where: { id: projectId },
        data: {
          lastScanAt: new Date(),
          riskScore
        }
      });

      console.log(`Scan ${scan.id} completed with ${result.violations.length} violations`);

      return NextResponse.json({
        success: true,
        data: {
          scan: {
            id: scan.id,
            status: 'completed',
            violationsFound: result.violations.length,
            pagesScanned: result.pagesScanned,
            summary: severityCounts
          },
          project: {
            id: projectId,
            riskScore
          }
        },
        message: `Scan completed. Found ${result.violations.length} violations.`
      });

    } catch (scanError) {
      console.error(`Scan ${scan.id} failed:`, scanError);
      
      // Update scan as failed
      await db.scan.update({
        where: { id: scan.id },
        data: {
          status: 'failed',
          errorMessage: sanitizeError(scanError),
          completedAt: new Date()
        }
      });

      return NextResponse.json({
        success: false,
        error: `Scan failed: ${sanitizeError(scanError)}`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating scan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scan' },
      { status: 500 }
    );
  }
}

// PATCH /api/scans - Update scan status
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`scans-patch:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'ID and status are required' },
        { status: 400 }
      );
    }

    const scan = await db.scan.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({
      success: true,
      data: scan
    });
  } catch (error) {
    console.error('Error updating scan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update scan' },
      { status: 500 }
    );
  }
}
