import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireVerifiedEmail } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { logger } from '@/lib/error-logger';
import { z } from 'zod';

const clientGroupSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/agency/client-groups — List client groups for current org
export async function GET(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  // Check permission - agency features for agency plan or custom role
  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_TEAM)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const clientGroups = await db.clientGroup.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ clientGroups });
}

// POST /api/agency/client-groups — Create client group
export async function POST(request: NextRequest) {
  const auth = await requireVerifiedEmail(request);
  if (auth instanceof NextResponse) return auth;

  const user = auth.user;
  const orgId = auth.user.orgId;

  const hasPermission = user.customRole
    ? user.customRole.permissions.includes(PERMISSIONS.MANAGE_TEAM)
    : user.role === 'owner' || user.role === 'admin';

  if (!hasPermission) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = clientGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid client group data', details: parsed.error.flatten() }, { status: 400 });
    }

    // Check slug uniqueness within org
    const existing = await db.clientGroup.findUnique({
      where: { orgId_slug: { orgId, slug: parsed.data.slug } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Slug already exists in this organization' }, { status: 400 });
    }

    const clientGroup = await db.clientGroup.create({
      data: {
        orgId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        website: parsed.data.website || null,
        logoUrl: parsed.data.logoUrl || null,
        primaryColor: parsed.data.primaryColor,
        secondaryColor: parsed.data.secondaryColor,
      },
    });

    return NextResponse.json({ success: true, clientGroup }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create client group');
    return NextResponse.json({ error: 'Failed to create client group' }, { status: 500 });
  }
}