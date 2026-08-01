import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { requireProjectAccess } from '@/lib/rbac';
import { logger } from '@/lib/error-logger';

export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`violations-batch:${clientId}`, rateLimits.default);
  if (!rateResult.success) return createRateLimitResponse(rateResult);

  try {
    const body = await request.json();
    const { ids, status, projectId } = body;

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
    }

    const access = await requireProjectAccess(request, projectId);
    if (access instanceof NextResponse) return access;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Violation IDs array is required' }, { status: 400 });
    }

    const validStatuses = ['open', 'fixed', 'ignored', 'false_positive'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const where: Record<string, unknown> = { id: { in: ids }, projectId: access.project.id };

    const result = await db.violation.updateMany({
      where,
      data: {
        status,
        fixedAt: status === 'fixed' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { updated: result.count },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to bulk update violations' }, { status: 500 });
  }
}
