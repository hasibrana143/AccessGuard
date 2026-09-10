import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireProjectAccess } from '@/lib/rbac';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

// GET /api/projects/[id] — single project for the detail page.
// (The detail UI called this endpoint but it never existed — every project
// page rendered "Not Found". Added with the same org-scoped guard as the
// list/create routes.)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`projects-get:${clientId}`, rateLimits.projects);
  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  const { id: projectId } = await params;
  const access = await requireProjectAccess(request, projectId);
  if (access instanceof NextResponse) return access;

  try {
    const project = await db.project.findFirst({
      where: { id: projectId, orgId: access.project.orgId, isActive: true },
    });
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    logger.error({ err: error }, 'project get failed');
    return NextResponse.json({ success: false, error: 'Failed to fetch project' }, { status: 500 });
  }
}
