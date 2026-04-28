import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { getAuditLogs, exportAuditLogsAsCsv } from '@/lib/audit';
import { validateSearchParams } from '@/lib/validations';
import { z } from 'zod';

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(['json', 'csv']).optional(),
});

// GET /api/audit - Get audit logs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can view audit logs
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    if (!user.orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(auditQuerySchema, searchParams);

    if (!validation.success) {
      return validation.error;
    }

    const { limit, offset, action, startDate, endDate, format } = validation.data;

    const result = await getAuditLogs(user.orgId, {
      limit,
      offset,
      action: action as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    // Export as CSV if requested
    if (format === 'csv') {
      const csv = exportAuditLogsAsCsv(result.logs);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
