import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { decryptSecret, encryptSecret, isEncrypted } from '@/lib/crypto';

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  config: z.object({
    baseUrl: z.string().url().optional(),
    email: z.string().email().optional(),
    apiToken: z.string().optional(),
    projectKey: z.string().optional(),
    apiKey: z.string().optional(),
    teamId: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    botToken: z.string().optional(),
    channelId: z.string().optional(),
    teamsWebhookUrl: z.string().url().optional(),
  }).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/integrations/:id — Get integration details
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_SETTINGS)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const integration = await db.integration.findFirst({
    where: { id, orgId },
    include: {
      integrationLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }

  // Sanitize config
  let config = {};
  try {
    const parsed = JSON.parse(integration.config);
    config = {
      ...parsed,
      apiToken: parsed.apiToken ? '••••••••' : undefined,
      apiKey: parsed.apiKey ? '••••••••' : undefined,
      botToken: parsed.botToken ? '••••••••' : undefined,
      teamsWebhookUrl: parsed.teamsWebhookUrl ? '••••••••' : undefined,
    };
  } catch {
    config = {};
  }

  return NextResponse.json({ integration: { ...integration, config } });
}

// PUT /api/integrations/:id — Update integration
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_SETTINGS)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { config, ...updateData } = parsed.data;

    // Encrypt sensitive config fields if provided
    if (config) {
      const configToStore = { ...config };
      if (configToStore.apiToken) configToStore.apiToken = encryptSecret(configToStore.apiToken);
      if (configToStore.apiKey) configToStore.apiKey = encryptSecret(configToStore.apiKey);
      if (configToStore.botToken) configToStore.botToken = encryptSecret(configToStore.botToken);
      if (configToStore.teamsWebhookUrl) configToStore.teamsWebhookUrl = encryptSecret(configToStore.teamsWebhookUrl);
      (updateData as any).config = JSON.stringify(configToStore);
    }

    const integration = await db.integration.update({
      where: { id, orgId },
      data: updateData as any,
    });

    await createAuditLog({
      orgId,
      userId: user.id,
      action: 'integration_updated',
      metadata: { integrationId: id, changes: Object.keys(updateData) },
    });

    return NextResponse.json({ success: true, integration: { ...integration, config: {} } });
  } catch (error) {
    logger.error({ err: error, id }, 'Failed to update integration');
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 });
  }
}

// DELETE /api/integrations/:id — Delete integration
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_SETTINGS)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    await db.integration.delete({ where: { id, orgId } });

    await createAuditLog({
      orgId,
      userId: user.id,
      action: 'integration_deleted',
      metadata: { integrationId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error, id }, 'Failed to delete integration');
    return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 });
  }
}