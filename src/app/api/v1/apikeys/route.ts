import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { apiKeyAuth, generateApiKey } from '@/lib/api-auth';
import { createAuditLog } from '@/lib/audit';

// GET /api/v1/apikeys - List API keys for current org
export async function GET(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  // Check permission
  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.API_KEYS_READ)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const apiKeys = await db.apiKey.findMany({
    where: { orgId, revokedAt: null },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ apiKeys });
}

// POST /api/v1/apikeys - Create new API key
export async function POST(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  // Check permission
  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.API_KEYS_WRITE)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, scopes = 'scans:read,scans:write,reports:read' } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { rawKey, prefix, hash } = generateApiKey();

    const apiKey = await db.apiKey.create({
      data: {
        orgId,
        name: name.trim(),
        prefix,
        hash,
        scopes,
      },
    });

    await createAuditLog({
      orgId,
      userId: user.id,
      action: 'api_key_created',
      metadata: { apiKeyId: apiKey.id, name: apiKey.name },
    });

    // Return the raw key ONLY once
    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        scopes: apiKey.scopes,
        createdAt: apiKey.createdAt,
      },
      rawKey, // Only shown once!
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create API key');
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}