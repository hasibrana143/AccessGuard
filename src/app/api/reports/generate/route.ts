import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { logger } from '@/lib/error-logger';

// Generate unique report ID
function generateReportId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `AG-${year}${month}-${random}`;
}

// Generate document hash
function generateDocumentHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

// GET /api/reports/generate - List reports
export async function GET() {
  const reports = await db.complianceReport.findMany({
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return NextResponse.json({ success: true, data: reports });
}

// POST /api/reports/generate - Generate report
export async function POST(request: Request) {
  try {
    const { projectId, reportType, dateRange } = await request.json();

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { violations: true }
        },
        violations: true
      }
    });

    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const reportId = generateReportId();
    const totalViolations = project.violations.length;
    const openViolations = project.violations.filter(v => v.status === 'open').length;
    
    const documentHash = generateDocumentHash(`${reportId}-${projectId}-${Date.now()}`);

    const report = await db.complianceReport.create({
      data: {
        projectId,
        name: `Compliance Report ${new Date().toISOString().split('T')[0]}`,
        reportType: reportType || 'full',
        dateRange: dateRange ? JSON.stringify(dateRange) : '{}',
        status: 'generated',
        metadata: JSON.stringify({
          reportId,
          documentHash,
          totalViolations,
          openViolations,
          complianceScore: Math.max(0, 100 - (openViolations * 2)),
        })
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        reportId,
        documentHash,
        downloadUrl: `/api/reports/download?id=${report.id}`
      }
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
  }
}

// DELETE /api/reports/generate - Delete report (must belong to the user's org)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    }

    const { requireVerifiedEmail } = await import('@/lib/rbac');
    const { PERMISSIONS } = await import('@/lib/permissions');
    const auth = await requireVerifiedEmail(request, { permission: PERMISSIONS.GENERATE_REPORTS });
    if (auth instanceof NextResponse) return auth;

    const existing = await db.complianceReport.findFirst({
      where: { id, project: { orgId: auth.user.orgId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    await db.complianceReport.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete report' }, { status: 500 });
  }
}
