import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, applyRateLimitHeaders, rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { getRequestId } from '@/lib/request-id';

const BATCH_LIMIT = 50;

function jsonWithRateLimit(data: object, status: number, rateResult: ReturnType<typeof checkRateLimit> extends Promise<infer R> ? R : never): Response {
  const response = NextResponse.json(data, { status });
  return applyRateLimitHeaders(response, rateResult);
}

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
      return jsonWithRateLimit({ success: false, error: 'violationIds array is required' }, 400, rateResult);
    }

    if (violationIds.length > BATCH_LIMIT) {
      return jsonWithRateLimit({ success: false, error: `Batch limit is ${BATCH_LIMIT} violations per request` }, 400, rateResult);
    }

    const auth = await requireVerifiedEmail(request, { permission: PERMISSIONS.GENERATE_REMEDIATION });
    if (auth instanceof NextResponse) return auth;

    const violations = await db.violation.findMany({
      where: { id: { in: violationIds }, project: { orgId: auth.user.orgId } },
    });

    if (violations.length === 0) {
      return jsonWithRateLimit({ success: false, error: 'No violations found' }, 404, rateResult);
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

    return jsonWithRateLimit({
      success: true,
      data: {
        results,
        total: results.length,
        succeeded,
        failed: results.length - succeeded,
        cached: results.filter(r => r.cached).length,
        requestId: getRequestId(request),
      },
    }, 200, rateResult);
  } catch (error) {
    logger.error({ err: error, requestId: getRequestId(request) }, '');
    return jsonWithRateLimit(
      { success: false, error: 'Failed to process batch remediation' },
      500, rateResult
    );
  }
}
