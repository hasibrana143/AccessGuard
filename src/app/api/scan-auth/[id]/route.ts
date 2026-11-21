import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import {
  encryptScanAuthConfig,
  maskScanAuthConfig,
  scanAuthConfigSchema,
} from '@/lib/scan-auth';

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: z.enum(['cookie', 'header', 'script']).optional(),
  config: scanAuthConfigSchema.optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

// Credentials are admin-level material: require a verified email plus the
// manage_settings permission on every verb (including reads).
const guard = (request: NextRequest) =>
  requireVerifiedEmail(request, { permission: PERMISSIONS.MANAGE_SETTINGS });

/** Load the config and prove it belongs to the caller's org (IDOR guard). */
async function loadOwnedConfig(id: string, orgId: string) {
  const authConfig = await db.scanAuthConfig.findFirst({ where: { id } });
  if (!authConfig) return { error: NextResponse.json({ error: 'Auth config not found' }, { status: 404 }) };

  const project = await db.project.findFirst({ where: { id: authConfig.projectId, orgId } });
  if (!project) {
    return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) };
  }
  return { authConfig };
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const { authConfig, error } = await loadOwnedConfig(id, orgId);
  if (error) return error;

  return NextResponse.json({ authConfig: { ...authConfig, config: maskScanAuthConfig(authConfig.config) } });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const { authConfig, error } = await loadOwnedConfig(id, orgId);
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { config, ...updateData } = parsed.data;
    const data: Record<string, unknown> = { ...updateData };
    if (config) {
      // Secrets are encrypted before they touch the database.
      data.config = encryptScanAuthConfig(config);
    }

    const authConfigUpdated = await db.scanAuthConfig.update({ where: { id }, data });

    await createAuditLog({
      orgId,
      userId: auth.user.id,
      action: 'scan_auth_updated',
      metadata: { authConfigId: id, projectId: authConfig.projectId, type: authConfigUpdated.type },
    });

    return NextResponse.json({ success: true, authConfig: { ...authConfigUpdated, config: {} } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update scan auth config');
    return NextResponse.json({ error: 'Failed to update scan auth config' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const { authConfig, error } = await loadOwnedConfig(id, orgId);
  if (error) return error;

  try {
    await db.scanAuthConfig.delete({ where: { id } });

    await createAuditLog({
      orgId,
      userId: auth.user.id,
      action: 'scan_auth_deleted',
      metadata: { authConfigId: id, projectId: authConfig.projectId, type: authConfig.type },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete scan auth config');
    return NextResponse.json({ error: 'Failed to delete scan auth config' }, { status: 500 });
  }
}
