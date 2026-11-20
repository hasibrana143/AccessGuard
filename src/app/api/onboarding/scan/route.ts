import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { scanUrl } from '@/services/scanner';
import { checkPagesLimit } from '@/lib/plan-limits';
import { z } from 'zod';

const onboardingScanSchema = z.object({
  url: z.string().url(),
  email: z.string().email().optional(), // Optional - for follow-up
});

// POST /api/onboarding/scan — Quick scan for onboarding (no auth required, rate-limited)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = onboardingScanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid URL', details: parsed.error.flatten() }, { status: 400 });
    }

    const { url, email } = parsed.data;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Run a quick single-page scan (desktop + mobile)
    const result = await scanUrl(url, { viewports: ['desktop', 'mobile'] });

    if (result.error) {
      // Don't expose internal errors, just say scan failed
      logger.warn({ url, error: result.error }, 'Onboarding scan failed');
      return NextResponse.json({ error: 'Unable to scan this URL. Please check it\'s publicly accessible.' }, { status: 400 });
    }

    // Sort violations by severity
    const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const sortedViolations = [...result.violations].sort((a, b) => 
      severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]
    );

    // Get top 3 fixes
    const topFixes = sortedViolations.slice(0, 3).map(v => ({
      ruleId: v.ruleId,
      wcagCriteria: v.wcagCriteria,
      severity: v.severity,
      description: v.description,
      url: v.url,
      elementSelector: v.elementSelector,
      // Quick fix preview
      quickFix: v.remediationCode ? 'Available' : 'Requires manual review',
    }));

    // Severity summary
    const severityCounts = {
      critical: result.violations.filter(v => v.severity === 'critical').length,
      serious: result.violations.filter(v => v.severity === 'serious').length,
      moderate: result.violations.filter(v => v.severity === 'moderate').length,
      minor: result.violations.filter(v => v.severity === 'minor').length,
    };

    // Risk score
    const riskScore = Math.max(0, Math.min(100, 100 - severityCounts.critical * 10 - severityCounts.serious * 5 - severityCounts.moderate * 2 - severityCounts.minor));

    // Store email for follow-up if provided
    if (email) {
      await db.organization.upsert({
        where: { slug: `onboarding-${Date.now()}` },
        create: { slug: `onboarding-${Date.now()}`, name: 'Onboarding Lead', plan: 'free', settings: JSON.stringify({ onboardingEmail: email }) },
        update: {},
      }).catch(() => {}); // Ignore errors
    }

    return NextResponse.json({
      success: true,
      url,
      scanSummary: {
        pagesScanned: result.pagesScanned,
        violationsFound: result.violations.length,
        severityCounts,
        riskScore,
      },
      topFixes,
      // Quick action links
      actions: {
        viewFullReport: `/onboarding/report?url=${encodeURIComponent(url)}`,
        signupForFullAccess: '/auth/register',
        downloadSampleVPAT: `/api/onboarding/vpat?url=${encodeURIComponent(url)}`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Onboarding scan failed');
    return NextResponse.json({ error: 'Scan failed. Please try again.' }, { status: 500 });
  }
}