import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';
import { generateRemediation, WCAG_RULES } from './remediation';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';

// POST /api/remediate - Generate AI remediation for a violation
export async function POST(request: NextRequest) {
  // Rate limiting (stricter for AI calls)
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`remediate:${clientId}`, rateLimits.remediation);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { violationId, forceRegenerate = false } = body;

    if (!violationId) {
      return NextResponse.json(
        { success: false, error: 'Violation ID is required' },
        { status: 400 }
      );
    }

    const auth = await requireVerifiedEmail(request, { permission: PERMISSIONS.GENERATE_REMEDIATION });
    if (auth instanceof NextResponse) return auth;

    // Get the violation from the database (scoped to the user's org)
    const violation = await db.violation.findFirst({
      where: { id: violationId, project: { orgId: auth.user.orgId } }
    });

    if (!violation) {
      return NextResponse.json(
        { success: false, error: 'Violation not found' },
        { status: 404 }
      );
    }

    // Check if remediation already exists
    if (violation.remediationCode && !forceRegenerate) {
      return NextResponse.json({
        success: true,
        data: {
          remediationCode: violation.remediationCode,
          explanation: violation.aiExplanation,
          confidence: violation.aiConfidenceScore,
          cached: true
        }
      });
    }

    // Generate new remediation
    const result = await generateRemediation({
      violationId: violation.id,
      elementHtml: violation.elementHtml || '',
      elementSelector: violation.elementSelector || '',
      description: violation.description,
      ruleId: violation.ruleId,
      wcagCriteria: violation.wcagCriteria || ''
    });

    // Update the violation with the new remediation
    await db.violation.update({
      where: { id: violationId },
      data: {
        remediationCode: result.remediationCode,
        aiExplanation: result.explanation,
        aiConfidenceScore: result.confidence
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        cached: false
      }
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to generate remediation' },
      { status: 500 }
    );
  }
}

// GET /api/remediate - Get WCAG rules reference
export async function GET() {
  return NextResponse.json({
    success: true,
    data: WCAG_RULES
  });
}
