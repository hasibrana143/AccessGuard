import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { apiKeyAuth } from '@/lib/api-auth';
import { generateVPATData } from '@/lib/vpat-generator';

// GET /api/v1/reports/vpat - Generate VPAT for project (API key auth)
export async function GET(request: NextRequest) {
  const auth = await apiKeyAuth(request, 'reports:read');
  if (auth.response) return auth.response;
  if (!auth.success || !auth.apiKey) return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });

  const { apiKey } = auth;
  const orgId = apiKey.orgId;

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const scanId = searchParams.get('scanId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  // Verify project belongs to org
  const project = await db.project.findFirst({
    where: { id: projectId, orgId },
    select: { id: true, name: true, url: true },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    const vpat = await generateVPATData(projectId, scanId || undefined);

    return NextResponse.json({
      project: { id: project.id, name: project.name, url: project.url },
      vpat,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error, projectId, orgId }, 'VPAT generation failed');
    return NextResponse.json({ error: 'Failed to generate VPAT' }, { status: 500 });
  }
}