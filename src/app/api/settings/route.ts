import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { logger } from '@/lib/error-logger';
import { requireOrgAccess, requirePermission, requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';

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

    // Profile + notification preferences are available to every member;
    // org-level settings (branding, webhooks, plan data) need manage_settings.
    const memberEditable = new Set(['name', 'email', 'alerts']);
    const requestedKeys = Object.keys(settings || {});
    const needsPermission = requestedKeys.some((k) => !memberEditable.has(k));

    const access = needsPermission
      ? await requirePermission(request, PERMISSIONS.MANAGE_SETTINGS)
      : await requireVerifiedEmail(request);
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
    const incoming = (settings || {}) as Record<string, unknown>;

    // name/email are user-level profile fields, not org settings
    let userUpdate: { name?: string; email?: string } = {};
    if (incoming.name !== undefined) {
      userUpdate.name = String(incoming.name).slice(0, 100);
    }
    if (incoming.email !== undefined) {
      userUpdate.email = String(incoming.email).toLowerCase().slice(0, 255);
    }
    if (userUpdate.name !== undefined || userUpdate.email !== undefined) {
      await db.user.update({
        where: { id: access.user.id },
        data: userUpdate,
      });
    }

    // SSRF guard: logoUrl is fetched server-side during PDF rendering
    if (incoming.logoUrl !== undefined && incoming.logoUrl !== null && incoming.logoUrl !== '') {
      const logoUrl = String(incoming.logoUrl);
      const { validateTargetUrl } = await import('@/lib/url-validation');
      const check = await validateTargetUrl(logoUrl);
      if (!check.ok) {
        return NextResponse.json(
          { success: false, error: `Invalid logo URL: ${check.error}` },
          { status: 400 }
        );
      }
    }
    // Webhook URL must be https
    if (incoming.slackWebhookUrl !== undefined && incoming.slackWebhookUrl !== null && incoming.slackWebhookUrl !== '') {
      const webhookUrl = String(incoming.slackWebhookUrl);
      if (!webhookUrl.startsWith('https://')) {
        return NextResponse.json(
          { success: false, error: 'Webhook URL must start with https://' },
          { status: 400 }
        );
      }
    }

    const { name, email, ...orgSettings } = incoming;
    const newSettings = { ...currentSettings, ...orgSettings };

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
          updatedFields: Object.keys(orgSettings),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newSettings,
        ...(userUpdate.name !== undefined ? { name: userUpdate.name } : {}),
        ...(userUpdate.email !== undefined ? { email: userUpdate.email } : {}),
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
