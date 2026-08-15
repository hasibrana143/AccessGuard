import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/error-logger';
import { createAuditLog } from '@/lib/audit';
import { setScimToken, isScimTokenConfigured } from '@/lib/scim';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

// GET /api/admin/scim - SCIM status (admin/owner)
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
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json({ success: false, error: 'Access denied. Admin role required.' }, { status: 403 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });
    if (!org) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        configured: isScimTokenConfigured(org.settings),
        endpoint: '/api/scim/v2',
        tokenEndpointHint: 'POST /api/admin/scim with {} to generate a token',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'get scim status failed');
    return NextResponse.json({ success: false, error: 'Failed to read SCIM status' }, { status: 500 });
  }
}

// POST /api/admin/scim - Generate a fresh SCIM bearer token (admin/owner)
export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`scim-token:${clientId}`, { interval: 60 * 1000, limit: 5 });
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
      return NextResponse.json({ success: false, error: 'Access denied. Admin role required.' }, { status: 403 });
    }

    const { token, maskedToken } = await setScimToken(orgId);

    await createAuditLog({
      orgId,
      action: 'scim.token_generated',
      metadata: { actorId: (session.user as { id?: string }).id },
      userId: (session.user as { id?: string }).id,
    });

    return NextResponse.json({
      success: true,
      data: { token, maskedToken, endpoint: '/api/scim/v2' },
    });
  } catch (error) {
    logger.error({ err: error }, 'generate scim token failed');
    return NextResponse.json({ success: false, error: 'Failed to generate SCIM token' }, { status: 500 });
  }
}
