import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';
import { requireAuth, requireProjectAccess } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (projectId) {
      const access = await requireProjectAccess(request, projectId);
      if (access instanceof NextResponse) return access;
      where.projectId = projectId;
    } else {
      const auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;
      where.project = { orgId: auth.user.orgId };
    }
    if (severity && severity !== 'all') where.severity = severity;
    if (status && status !== 'all') where.status = status;

    const violations = await db.violation.findMany({
      where,
      include: { project: { select: { name: true, url: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });

    // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR)
    const safeCell = (value: unknown): string => {
      const str = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
      return str;
    };

    const headers = ['Rule ID', 'WCAG Criteria', 'Severity', 'Status', 'URL', 'Element Selector', 'Description', 'Project', 'Created At', 'AI Confidence'];
    const rows = violations.map(v => [
      safeCell(v.ruleId),
      safeCell(v.wcagCriteria || ''),
      safeCell(v.severity),
      safeCell(v.status),
      safeCell(v.url),
      safeCell(v.elementSelector || ''),
      safeCell(v.description),
      safeCell(v.project?.name || ''),
      safeCell(v.createdAt.toISOString()),
      safeCell(v.aiConfidenceScore?.toString() || ''),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="accessguard-violations-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    return NextResponse.json({ success: false, error: 'Failed to export violations' }, { status: 500 });
  }
}
