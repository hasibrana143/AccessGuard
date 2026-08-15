import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/error-logger';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

const ALLOWED_REGIONS = ['us', 'eu'] as const;
type DataRegion = (typeof ALLOWED_REGIONS)[number];

function isAllowedRegion(value: string): value is DataRegion {
  return (ALLOWED_REGIONS as readonly string[]).includes(value);
}

// GET /api/settings/region - Read the organization's data residency region
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }

    const org = await db.organization.findUnique({ where: { id: orgId }, select: { dataRegion: true } });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, dataRegion: org.dataRegion });
  } catch (error) {
    logger.error({ err: error }, 'get data region failed');
    return NextResponse.json({ success: false, error: 'Failed to read data region' }, { status: 500 });
  }
}

// PATCH /api/settings/region - Set the data residency region (admin/owner only)
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`region:${clientId}`, rateLimits.default);
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as { dataRegion?: unknown } | null;
    const dataRegion = body?.dataRegion;
    if (typeof dataRegion !== 'string' || !isAllowedRegion(dataRegion)) {
      return NextResponse.json(
        { success: false, error: `Invalid region. Supported: ${ALLOWED_REGIONS.join(', ')}` },
        { status: 400 }
      );
    }

    await db.organization.update({
      where: { id: orgId },
      data: { dataRegion },
    });

    return NextResponse.json({ success: true, dataRegion });
  } catch (error) {
    logger.error({ err: error }, 'update data region failed');
    return NextResponse.json({ success: false, error: 'Failed to update data region' }, { status: 500 });
  }
}
