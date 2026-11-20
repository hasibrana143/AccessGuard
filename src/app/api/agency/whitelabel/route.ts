import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { z } from 'zod';

const whitelabelSchema = z.object({
  clientGroupId: z.string().optional().nullable(), // null = org-wide default
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  fontFamily: z.string().max(50).optional().nullable(),
  companyName: z.string().max(100).optional().nullable(),
  companyUrl: z.string().url().optional().nullable(),
  footerText: z.string().max(500).optional().nullable(),
  showPoweredBy: z.boolean().optional(),
});

// GET /api/agency/whitelabel — List white-label configs
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

  const configs = await db.whiteLabelConfig.findMany({
    where: { orgId },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({ configs });
}

// POST /api/agency/whitelabel — Create/update white-label config
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
    const parsed = whitelabelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const { clientGroupId, ...data } = parsed.data;

    // If clientGroupId provided, verify it belongs to org
    if (clientGroupId) {
      const cg = await db.clientGroup.findFirst({ where: { id: clientGroupId, orgId } });
      if (!cg) {
        return NextResponse.json({ error: 'Client group not found' }, { status: 404 });
      }
    }

    // Upsert by orgId + clientGroupId
    const existing = await db.whiteLabelConfig.findFirst({
      where: { orgId, clientGroupId: clientGroupId ?? null },
    });

    let config;
    if (existing) {
      config = await db.whiteLabelConfig.update({
        where: { id: existing.id },
        data: { ...data, clientGroupId: clientGroupId ?? null },
      });
    } else {
      config = await db.whiteLabelConfig.create({
        data: {
          orgId,
          clientGroupId: clientGroupId ?? null,
          ...data,
        },
      });
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    logger.error({ err: error }, 'Failed to upsert white-label config');
    return NextResponse.json({ error: 'Failed to save white-label config' }, { status: 500 });
  }
}