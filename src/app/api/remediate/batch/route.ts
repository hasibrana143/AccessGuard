import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

const BATCH_LIMIT = 50;

type BatchResult = {
  violationId: string;
  success: boolean;
  cached?: boolean;
  confidence?: number | null;
  error?: string;
};

type CostAccumulator = {
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  models: Record<string, number>;
};

// POST /api/remediate/batch - Generate AI remediation for multiple violations
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`remediate-batch:${clientId}`, rateLimits.remediation);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { violationIds, forceRegenerate = false } = body;

    if (!violationIds || !Array.isArray(violationIds) || violationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'violationIds array is required' },
        { status: 400 }
      );
    }

    if (violationIds.length > BATCH_LIMIT) {
      return NextResponse.json(
        { success: false, error: `Batch limit is ${BATCH_LIMIT} violations per request` },
        { status: 400 }
      );
    }

    const auth = await requireVerifiedEmail(request, { permission: PERMISSIONS.GENERATE_REMEDIATION });
    if (auth instanceof NextResponse) return auth;

    const violations = await db.violation.findMany({
      where: { id: { in: violationIds }, project: { orgId: auth.user.orgId } },
    });

    if (violations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No violations found' },
        { status: 404 }
      );
    }

    const { generateRemediation } = await import('@/app/api/remediate/remediation');

    const results: BatchResult[] = [];
    const costs: CostAccumulator = {
      llmCalls: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      models: {},
    };
    for (const violation of violations) {
      try {
        if (violation.remediationCode && !forceRegenerate) {
          results.push({
            violationId: violation.id,
            success: true,
            cached: true,
            confidence: violation.aiConfidenceScore,
          });
          continue;
        }

        const result = await generateRemediation({
          violationId: violation.id,
          elementHtml: violation.elementHtml || '',
          elementSelector: violation.elementSelector || '',
          description: violation.description,
          ruleId: violation.ruleId,
          wcagCriteria: violation.wcagCriteria || '',
        });

        await db.violation.update({
          where: { id: violation.id },
          data: {
            remediationCode: result.remediationCode,
            aiExplanation: result.explanation,
            aiConfidenceScore: result.confidence,
          },
        });

        if (result.usage && result.costEstimate) {
          costs.llmCalls += 1;
          costs.promptTokens += result.usage.promptTokens;
          costs.completionTokens += result.usage.completionTokens;
          costs.totalTokens += result.usage.totalTokens;
          costs.costUsd += result.costEstimate.costUsd;
          const model = result.model || 'unknown';
          costs.models[model] = (costs.models[model] || 0) + 1;
        }

        results.push({
          violationId: violation.id,
          success: true,
          cached: false,
          confidence: result.confidence,
        });
      } catch (err) {
        logger.error({ err, violationId: violation.id }, 'Batch remediation failed for violation');
        results.push({
          violationId: violation.id,
          success: false,
          error: err instanceof Error ? err.message : 'Generation failed',
        });
      }
    }

    const succeeded = results.filter(r => r.success).length;

    if (costs.llmCalls > 0) {
      await createAuditLog({
        orgId: auth.user.orgId,
        action: 'remediation_ai_cost',
        userId: auth.user.id,
        metadata: {
          batchSize: results.length,
          llmCalls: costs.llmCalls,
          promptTokens: costs.promptTokens,
          completionTokens: costs.completionTokens,
          totalTokens: costs.totalTokens,
          costUsd: Math.round(costs.costUsd * 1_000_000) / 1_000_000,
          models: costs.models,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        total: results.length,
        succeeded,
        failed: results.length - succeeded,
        cached: results.filter(r => r.cached).length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to process batch remediation' },
      { status: 500 }
    );
  }
}
