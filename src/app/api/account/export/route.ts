import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getToken } from 'next-auth/jwt';
import { logger } from '@/lib/error-logger';

const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || !token.sub) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = token.sub;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const projects = await db.project.findMany({
      where: { orgId: user.orgId },
      select: { id: true, name: true, url: true, createdAt: true, riskScore: true },
    });

    const scans = await db.scan.findMany({
      where: { project: { orgId: user.orgId } },
      select: { id: true, projectId: true, status: true, createdAt: true, pagesScanned: true, violationsFound: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const violations = await db.violation.findMany({
      where: { project: { orgId: user.orgId } },
      select: { id: true, ruleId: true, severity: true, status: true, url: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const auditLogs = await db.auditLog.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            plan: user.organization.plan,
            createdAt: user.organization.createdAt,
          }
        : null,
      projects,
      scans,
      violations,
      auditLogs,
    };

    logger.info({ userId }, 'User data exported');

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="accessguard-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error({ err: error, userId: token.sub }, 'Data export failed');
    return NextResponse.json({ success: false, error: 'Failed to export data' }, { status: 500 });
  }
}
