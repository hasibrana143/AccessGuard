import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { scanWithBrowser, scanFromHTML, type BrowserViolation } from '@/services/browser-scanner';
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

// POST /api/scans - Create and execute a scan
export async function POST(request: NextRequest) {
  // Rate limiting (stricter for scans)
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`scans-post:${clientId}`, rateLimits.scan);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { projectId, html, useBrowser = true } = body;

    // Handle manual HTML upload
    if (html) {
      const project = await db.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }

      const scan = await db.scan.create({
        data: {
          projectId,
          status: 'running'
        }
      });

      try {
        const result = scanFromHTML(html, project.url);
        
        const violationsToCreate = result.violations.map((v: BrowserViolation) => ({
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

        if (violationsToCreate.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < violationsToCreate.length; i += batchSize) {
            const batch = violationsToCreate.slice(i, i + batchSize);
            await db.violation.createMany({ data: batch });
          }
        }

        const severityCounts = {
          critical: result.violations.filter(v => v.severity === 'critical').length,
          serious: result.violations.filter(v => v.severity === 'serious').length,
          moderate: result.violations.filter(v => v.severity === 'moderate').length,
          minor: result.violations.filter(v => v.severity === 'minor').length,
        };

        let riskScore = 100;
        riskScore -= severityCounts.critical * 10;
        riskScore -= severityCounts.serious * 5;
        riskScore -= severityCounts.moderate * 2;
        riskScore -= severityCounts.minor * 1;
        riskScore = Math.max(0, Math.min(100, riskScore));

        await db.scan.update({
          where: { id: scan.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            pagesScanned: 1,
            violationsFound: result.violations.length,
            summary: JSON.stringify(severityCounts)
          }
        });

        await db.project.update({
          where: { id: projectId },
          data: { lastScanAt: new Date(), riskScore }
        });

        return NextResponse.json({
          success: true,
          data: {
            scan: {
              id: scan.id,
              status: 'completed',
              violationsFound: result.violations.length,
              pagesScanned: 1,
              summary: severityCounts
            }
          },
          message: `Manual scan completed. Found ${result.violations.length} violations.`
        });

      } catch (error) {
        await db.scan.update({
          where: { id: scan.id },
          data: { status: 'failed', errorMessage: 'Manual scan failed', completedAt: new Date() }
        });
        return NextResponse.json({ success: false, error: 'Manual scan failed' }, { status: 500 });
      }
    }

    // Regular URL scan
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

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

    console.log(`Starting scan ${scan.id} for ${project.url} (browser: ${useBrowser})`);

    try {
      let result;
      
      // Try browser scanner first (if enabled), fall back to simple scanner
      if (useBrowser) {
        console.log('Using browser-based scanner...');
        result = await scanWithBrowser(project.url, { waitTime: 3000 });
        
        // If browser scanner fails, try simple scanner as fallback
        if (result.error && !result.error.includes('403') && !result.error.includes('429')) {
          console.log('Browser scanner failed, trying simple scanner...');
          result = await scanUrlServer(project.url);
        }
      } else {
        console.log('Using simple HTTP scanner...');
        result = await scanUrlServer(project.url);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      // Create violations from scan results
      const violationsToCreate = result.violations.map((v: BrowserViolation | ServerViolation) => ({
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
        critical: result.violations.filter((v: BrowserViolation | ServerViolation) => v.severity === 'critical').length,
        serious: result.violations.filter((v: BrowserViolation | ServerViolation) => v.severity === 'serious').length,
        moderate: result.violations.filter((v: BrowserViolation | ServerViolation) => v.severity === 'moderate').length,
        minor: result.violations.filter((v: BrowserViolation | ServerViolation) => v.severity === 'minor').length,
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
      
      // Determine error type for better user feedback
      const errorMsg = scanError instanceof Error ? scanError.message : 'Unknown error';
      let userMessage = 'Scan failed';
      let statusCode = 500;
      
      if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
        userMessage = 'The target website is rate limiting requests. Please try again later or use the manual HTML upload option.';
        statusCode = 429;
      } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        userMessage = 'The target website blocked the scan. Please use the manual HTML upload option to scan protected pages.';
        statusCode = 403;
      } else if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        userMessage = 'The URL was not found. Please check the website address.';
        statusCode = 404;
      } else if (errorMsg.includes('timeout')) {
        userMessage = 'The scan timed out. The website may be slow or unavailable.';
        statusCode = 504;
      } else if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
        userMessage = 'Could not connect to the website. Please check the URL is correct and accessible.';
        statusCode = 502;
      }
      
      // Update scan as failed
      await db.scan.update({
        where: { id: scan.id },
        data: {
          status: 'failed',
          errorMessage: userMessage,
          completedAt: new Date()
        }
      });

      return NextResponse.json({
        success: false,
        error: userMessage
      }, { status: statusCode });
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
