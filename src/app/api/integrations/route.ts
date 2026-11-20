import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { decryptSecret, encryptSecret, isEncrypted } from '@/lib/crypto';

const integrationSchema = z.object({
  type: z.enum(['jira', 'linear', 'slack', 'teams']),
  name: z.string().min(1).max(50),
  config: z.object({
    // Jira
    baseUrl: z.string().url().optional(),
    email: z.string().email().optional(),
    apiToken: z.string().optional(),
    projectKey: z.string().optional(),
    // Linear
    apiKey: z.string().optional(),
    teamId: z.string().optional(),
    // Slack
    webhookUrl: z.string().url().optional(),
    botToken: z.string().optional(),
    channelId: z.string().optional(),
    // Teams
    teamsWebhookUrl: z.string().url().optional(),
  }).optional(),
});

// GET /api/integrations — List integrations
export async function GET(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_SETTINGS)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const integrations = await db.integration.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { integrationLogs: true } } },
  });

  // Decrypt config for display (mask sensitive fields)
  const sanitized = integrations.map(i => {
    let config = {};
    try {
      const parsed = JSON.parse(i.config);
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
    return { ...i, config };
  });

  return NextResponse.json({ integrations: sanitized });
}

// POST /api/integrations — Create integration
export async function POST(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_SETTINGS)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = integrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { type, name, config } = parsed.data;

    // Check uniqueness
    const existing = await db.integration.findUnique({
      where: { orgId_type_name: { orgId, type, name } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Integration with this name already exists' }, { status: 400 });
    }

    // Encrypt sensitive config fields
    const configToStore = config ? { ...config } : {};
    if (configToStore.apiToken) configToStore.apiToken = encryptSecret(configToStore.apiToken);
    if (configToStore.apiKey) configToStore.apiKey = encryptSecret(configToStore.apiKey);
    if (configToStore.botToken) configToStore.botToken = encryptSecret(configToStore.botToken);
    if (configToStore.teamsWebhookUrl) configToStore.teamsWebhookUrl = encryptSecret(configToStore.teamsWebhookUrl);

    const integration = await db.integration.create({
      data: {
        orgId,
        type,
        name,
        config: JSON.stringify(configToStore),
        isActive: true,
      },
    });

    await createAuditLog({
      orgId,
      userId: user.id,
      action: 'integration_created',
      metadata: { integrationId: integration.id, type, name },
    });

    // Return sanitized
    return NextResponse.json({ success: true, integration: { ...integration, config: {} } }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create integration');
    return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 });
  }
}