import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireProjectAccess } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';
import { z } from 'zod';
import { MANUAL_CHECKS, MANUAL_CHECK_STATUSES, getCheckDef } from '@/lib/manual-checks';

// Guided manual-testing results per project. GET merges the static catalog
// with saved outcomes; PUT upserts outcomes (members need MANAGE_VIOLATIONS,
// the same permission as automated violation triage).

type Params = { params: Promise<{ id: string }> };

const saveSchema = z.object({
  results: z
    .array(
      z.object({
        checkId: z.string(),
        status: z.enum(MANUAL_CHECK_STATUSES),
        notes: z.string().max(2000).optional(),
      })
    )
    .min(1)
    .max(100),
});

// GET /api/projects/[id]/manual-checks — catalog + saved statuses
export async function GET(request: NextRequest, { params }: Params) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(request, projectId);
  if (access instanceof NextResponse) return access;

  try {
    const saved = await db.manualCheck.findMany({ where: { projectId } });
    const byId = new Map(saved.map((s) => [s.checkId, s]));
    return NextResponse.json({
      success: true,
      data: MANUAL_CHECKS.map((c) => {
        const s = byId.get(c.id);
        return {
          ...c,
          status: s?.status ?? 'pending',
          notes: s?.notes ?? null,
          checkedBy: s?.checkedBy ?? null,
          updatedAt: s?.updatedAt ?? null,
        };
      }),
    });
  } catch (error) {
    logger.error({ err: error }, 'manual checks list failed');
    return NextResponse.json({ success: false, error: 'Failed to load manual checks' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/manual-checks — save outcomes
export async function PUT(request: NextRequest, { params }: Params) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`manual-checks:${clientId}`, rateLimits.default);
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  const { id: projectId } = await params;
  const access = await requireProjectAccess(request, projectId, { permission: PERMISSIONS.MANAGE_VIOLATIONS });
  if (access instanceof NextResponse) return access;

  try {
    const body = await request.json().catch(() => null);
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid results payload' }, { status: 400 });
    }

    for (const r of parsed.data.results) {
      if (!getCheckDef(r.checkId)) {
        return NextResponse.json(
          { success: false, error: `Unknown checkId: ${r.checkId}` },
          { status: 400 }
        );
      }
    }

    await db.$transaction(
      parsed.data.results.map((r) =>
        db.manualCheck.upsert({
          where: { projectId_checkId: { projectId, checkId: r.checkId } },
          update: { status: r.status, notes: r.notes ?? null, checkedBy: access.user.id },
          create: {
            projectId,
            checkId: r.checkId,
            status: r.status,
            notes: r.notes ?? null,
            checkedBy: access.user.id,
          },
        })
      )
    );

    await db.auditLog.create({
      data: {
        orgId: access.project.orgId,
        action: 'manual_checks_updated',
        metadata: JSON.stringify({
          projectId,
          count: parsed.data.results.length,
          userId: access.user.id,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    const saved = await db.manualCheck.findMany({ where: { projectId } });
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    logger.error({ err: error }, 'manual checks save failed');
    return NextResponse.json({ success: false, error: 'Failed to save manual checks' }, { status: 500 });
  }
}
