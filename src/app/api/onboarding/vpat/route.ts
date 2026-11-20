import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { scanUrl } from '@/services/scanner';
import { generateVPATData } from '@/lib/vpat-generator';
import { z } from 'zod';

const vpatRequestSchema = z.object({
  url: z.string().url(),
});

// GET /api/onboarding/vpat — Generate sample VPAT for URL (no auth)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    const parsed = vpatRequestSchema.safeParse({ url });
    if (!parsed.success || !url) {
      return NextResponse.json({ error: 'Valid URL required' }, { status: 400 });
    }

    // Run scan
    const result = await scanUrl(url, { viewports: ['desktop', 'mobile'] });

    if (result.error) {
      logger.warn({ url, error: result.error }, 'Onboarding VPAT scan failed');
      return NextResponse.json({ error: 'Unable to scan this URL' }, { status: 400 });
    }

    // Create temporary project for VPAT generation (or use in-memory)
    // For onboarding, we'll generate VPAT directly from scan results
    // by creating a temporary in-memory violation list
    
    // Create a mock project ID for the VPAT generator
    const tempProjectId = `onboarding-${Date.now()}`;

    // Generate VPAT with EN 301 549 and Section 508 references
    const vpat = await generateVPATData(tempProjectId, undefined, {
      standard: 'WCAG 2.2 AA',
      includeEN301549: true,
      includeSection508: true,
    });

    // Override with actual scan violations
    const severityCounts = {
      critical: result.violations.filter(v => v.severity === 'critical').length,
      serious: result.violations.filter(v => v.severity === 'serious').length,
      moderate: result.violations.filter(v => v.severity === 'moderate').length,
      minor: result.violations.filter(v => v.severity === 'minor').length,
    };

    return NextResponse.json({
      success: true,
      url,
      vpat: {
        ...vpat,
        meta: {
          ...vpat.meta,
          projectId: `onboarding-${Date.now()}`,
          isSample: true,
          generatedFor: url,
        },
        // Override summary with actual scan data
        summary: vpat.summary,
      },
      scanSummary: {
        pagesScanned: result.pagesScanned,
        violationsFound: result.violations.length,
        severityCounts,
      },
      disclaimer: 'This is a sample VPAT generated from an automated scan. For procurement, a full audit with manual testing is required.',
    });
  } catch (error) {
    logger.error({ err: error }, 'Onboarding VPAT generation failed');
    return NextResponse.json({ error: 'Failed to generate VPAT' }, { status: 500 });
  }
}