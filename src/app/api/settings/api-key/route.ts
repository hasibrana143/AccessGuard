import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { encryptSecret, decryptSecret, isEncrypted } from '@/lib/crypto';
import { requireAuth, requirePermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';

// GET /api/settings/api-key - Get the org's API key (masked)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    if (orgId !== auth.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const settings = org.settings ? JSON.parse(org.settings) : {};
    const storedKey: string | undefined = settings.apiKey;

    if (!storedKey) {
      return NextResponse.json({ success: true, data: { apiKey: null, maskedKey: null } });
    }

    const apiKey = isEncrypted(storedKey) ? (decryptSecret(storedKey) ?? storedKey) : storedKey;
    const maskedKey = `${apiKey.slice(0, 10)}${'•'.repeat(16)}${apiKey.slice(-4)}`;

    return NextResponse.json({ success: true, data: { apiKey, maskedKey } });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch API key' },
      { status: 500 }
    );
  }
}

// POST /api/settings/api-key - Generate a new API key (admin or owner only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.MANAGE_SETTINGS);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    if (orgId !== auth.user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const apiKey = `ag_live_${randomBytes(24).toString('hex')}`;
    const settings = org.settings ? JSON.parse(org.settings) : {};
    settings.apiKey = encryptSecret(apiKey);

    await db.organization.update({
      where: { id: orgId },
      data: { settings: JSON.stringify(settings) },
    });

    await db.auditLog.create({
      data: {
        orgId,
        action: 'api_key_regenerated',
        metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
      },
    });

    const maskedKey = `${apiKey.slice(0, 10)}${'•'.repeat(16)}${apiKey.slice(-4)}`;

    return NextResponse.json({ success: true, data: { apiKey, maskedKey } });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json(
      { success: false, error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}
