import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireViolationAccess } from '@/lib/rbac';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

// GET /api/violations/[id] — single violation with project info (org-scoped).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`violations-get:${clientId}`, rateLimits.default);
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  const { id: violationId } = await params;
  const access = await requireViolationAccess(request, violationId);
  if (access instanceof NextResponse) return access;

  try {
    const violation = await db.violation.findUnique({
      where: { id: access.violation.id },
      include: {
        project: { select: { name: true, url: true } },
      },
    });
    if (!violation) {
      return NextResponse.json({ success: false, error: 'Violation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: violation });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching violation');
    return NextResponse.json({ success: false, error: 'Failed to fetch violation' }, { status: 500 });
  }
}
