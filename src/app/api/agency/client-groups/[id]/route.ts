import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  website: z.string().url().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/agency/client-groups/:id — Get client group details
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_TEAM)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const clientGroup = await db.clientGroup.findFirst({
    where: { id, orgId },
  });

  if (!clientGroup) {
    return NextResponse.json({ error: 'Client group not found' }, { status: 404 });
  }

  return NextResponse.json({ clientGroup });
}

// PUT /api/agency/client-groups/:id — Update client group
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_TEAM)
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

    // Check slug uniqueness if being changed
    if (parsed.data.slug) {
      const existing = await db.clientGroup.findFirst({
        where: { orgId, slug: parsed.data.slug, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: 'Slug already exists in this organization' }, { status: 400 });
      }
    }

    const clientGroup = await db.clientGroup.update({
      where: { id, orgId },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        website: parsed.data.website,
        logoUrl: parsed.data.logoUrl,
        primaryColor: parsed.data.primaryColor,
        secondaryColor: parsed.data.secondaryColor,
      },
    });

    return NextResponse.json({ success: true, clientGroup });
  } catch (error) {
    logger.error({ err: error, id }, 'Failed to update client group');
    return NextResponse.json({ error: 'Failed to update client group' }, { status: 500 });
  }
}

// DELETE /api/agency/client-groups/:id — Delete client group
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;
  const { id } = await params;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_TEAM)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    await db.clientGroup.delete({ where: { id, orgId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error, id }, 'Failed to delete client group');
    return NextResponse.json({ error: 'Failed to delete client group' }, { status: 500 });
  }
}