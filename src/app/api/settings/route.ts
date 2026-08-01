import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';
import { requireOrgAccess, requireRole } from '@/lib/rbac';

// GET /api/settings - Get organization settings
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`settings-get:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const orgParam = searchParams.get('orgId');

    const access = await requireOrgAccess(request, orgParam);
    if (access instanceof NextResponse) return access;

    const org = await db.organization.findUnique({
      where: { id: access.org.id },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        stripeCustomerId: true,
        githubConnections: {
          select: {
            id: true,
            isActive: true,
            repositories: true,
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const settings = org.settings ? JSON.parse(org.settings) : {};

    return NextResponse.json({
      success: true,
      data: {
        ...org,
        settings,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update organization settings
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`settings-patch:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { orgId, settings } = body;

    const access = await requireRole(request, ['admin', 'owner']);
    if (access instanceof NextResponse) return access;
    if (orgId && orgId !== access.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    const org = await db.organization.findUnique({
      where: { id: access.user.orgId },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Merge with existing settings
    const currentSettings = org.settings ? JSON.parse(org.settings) : {};
    const newSettings = { ...currentSettings, ...settings };

    await db.organization.update({
      where: { id: access.user.orgId },
      data: { settings: JSON.stringify(newSettings) },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId: access.user.orgId,
        action: 'settings_updated',
        metadata: JSON.stringify({
          updatedFields: Object.keys(settings),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: newSettings,
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
