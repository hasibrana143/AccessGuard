import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

// GET /api/settings - Get organization settings
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`settings-get:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
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
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update organization settings
export async function PATCH(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = checkRateLimit(`settings-patch:${clientId}`, rateLimits.default);
  
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const body = await request.json();
    const { orgId, settings } = body;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
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
      where: { id: orgId },
      data: { settings: JSON.stringify(newSettings) },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        orgId,
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
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
