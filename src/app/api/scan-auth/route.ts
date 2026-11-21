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

const createSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['cookie', 'header', 'script']),
  projectId: z.string().min(1),
  config: scanAuthConfigSchema.optional(),
});

// Credentials are admin-level material: require a verified email plus the
// manage_settings permission on every verb (including reads).
const guard = (request: NextRequest) =>
  requireVerifiedEmail(request, { permission: PERMISSIONS.MANAGE_SETTINGS });

export async function GET(request: NextRequest) {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const orgId = auth.user.orgId;

  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Tenant scope: the project must belong to the caller's org.
  const project = await db.project.findFirst({ where: { id: projectId, orgId } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const authConfigs = await db.scanAuthConfig.findMany({
    where: { projectId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    authConfigs: authConfigs.map((c) => ({ ...c, config: maskScanAuthConfig(c.config) })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await guard(request);
  if (auth instanceof NextResponse) return auth;
  const orgId = auth.user.orgId;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, type, projectId, config } = parsed.data;

    const project = await db.project.findFirst({ where: { id: projectId, orgId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const authConfig = await db.scanAuthConfig.create({
      data: {
        projectId,
        name,
        type,
        // Secrets are encrypted before they touch the database.
        config: encryptScanAuthConfig(config ?? {}),
        isActive: true,
      },
    });

    await createAuditLog({
      orgId,
      userId: auth.user.id,
      action: 'scan_auth_created',
      metadata: { authConfigId: authConfig.id, projectId, type },
    });

    return NextResponse.json({ success: true, authConfig: { ...authConfig, config: {} } }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create scan auth config');
    return NextResponse.json({ error: 'Failed to create scan auth config' }, { status: 500 });
  }
}
