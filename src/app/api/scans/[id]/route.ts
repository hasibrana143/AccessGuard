import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireScanAccess } from '@/lib/rbac';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

// GET /api/scans/[id] — single scan with project info (org-scoped).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`scans-get:${clientId}`, rateLimits.default);
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  const { id: scanId } = await params;
  const access = await requireScanAccess(request, scanId);
  if (access instanceof NextResponse) return access;

  try {
    const scan = await db.scan.findUnique({
      where: { id: access.scan.id },
      include: {
        project: { select: { name: true, url: true } },
        _count: { select: { violations: true } },
      },
    });
    if (!scan) {
      return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: scan });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching scan');
    return NextResponse.json({ success: false, error: 'Failed to fetch scan' }, { status: 500 });
  }
}
