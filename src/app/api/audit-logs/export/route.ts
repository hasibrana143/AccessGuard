import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/error-logger';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

/**
 * GET /api/audit-logs/export - Export audit logs for SIEM ingestion.
 * Enterprise feature: organizes org activity for Splunk / Datadog / Sumo / Elastic.
 *
 * Guard chain: auth → org → role (admin/owner) → rate limit → query.
 *
 * Query params:
 *  - since:  ISO date (default: 30 days ago)
 *  - until:  ISO date (default: now)
 *  - format: json (default) | csv | cef
 *  - limit:  max 10000 events (default 1000)
 */
export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateResult = await checkRateLimit(`audit-export:${clientId}`, rateLimits.default);

  if (!rateResult.success) {
    return createRateLimitResponse(rateResult);
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json({ success: false, error: 'No organization found' }, { status: 403 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();
    if (!['json', 'csv', 'cef'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Supported: json, csv, cef' },
        { status: 400 }
      );
    }

    // Parse time window with safe defaults
    const sinceParam = searchParams.get('since');
    const untilParam = searchParams.get('until') || new Date().toISOString();
    const now = Date.now();
    const since = sinceParam ? new Date(sinceParam).toISOString() : new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const until = new Date(untilParam).toISOString();

    let sinceDate = new Date(since);
    let untilDate = new Date(until);
    if (isNaN(sinceDate.getTime())) sinceDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    if (isNaN(untilDate.getTime())) untilDate = new Date();
    if (sinceDate.getTime() > untilDate.getTime()) [sinceDate, untilDate] = [untilDate, sinceDate];

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '1000', 10) || 1000, 1), 10000);

    const logs = await db.auditLog.findMany({
      where: { orgId, createdAt: { gte: sinceDate, lte: untilDate } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    // Common event format prefix for SIEM ingestion
    const cefHeader = (log: { id: string; action: string; createdAt: Date; metadata: string }) => {
      const meta = (() => {
        try { return JSON.parse(log.metadata); } catch { return {}; }
      })();
      // CEF: CEF:Version|DeviceVendor|DeviceProduct|DeviceVersion|SignatureID|Name|Severity|Extension
      return `CEF:0|AccessGuard|SaaS|1.0|${log.action}|${log.action}|3|`;
    };

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: logs.map((log) => ({
          id: log.id,
          orgId: log.orgId,
          action: log.action,
          createdAt: log.createdAt.toISOString(),
          metadata: (() => {
            try { return JSON.parse(log.metadata); } catch { return {}; }
          })(),
        })),
        total: logs.length,
        window: { since: sinceDate.toISOString(), until: untilDate.toISOString() },
      });
    }

    if (format === 'csv') {
      const safeCell = (value: unknown): string => {
        const str = String(value ?? '');
        if (/^[=+\-@\t\r]/.test(str)) return `'${str}`;
        return str.replace(/"/g, '""');
      };
      const headers = ['id', 'orgId', 'action', 'createdAt', 'metadata'];
      const rows = logs.map((log) => [
        safeCell(log.id),
        safeCell(log.orgId),
        safeCell(log.action),
        safeCell(log.createdAt.toISOString()),
        safeCell(log.metadata),
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="accessguard-audit-${sinceDate.toISOString().split('T')[0]}-to-${untilDate.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // cef (Common Event Format) — for Splunk / ArcSight / QRadar ingestion
    const cefLines = logs.map((log) => {
      const meta = (() => { try { return JSON.parse(log.metadata); } catch { return {}; } })();
      const ext: Record<string, string> = {
        eventId: log.id,
        act: log.action,
        rt: String(log.createdAt.getTime()),
        suser: String(meta.userId || ''),
        cn1: String(log.orgId),
        msg: JSON.stringify(meta),
      };
      const extStr = Object.entries(ext).map(([k, v]) => `${k}=${v}`).join(' ');
      return `${cefHeader(log)} ${extStr}`;
    }).join('\n');
    return new NextResponse(cefLines, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="accessguard-audit-${sinceDate.toISOString().split('T')[0]}-to-${untilDate.toISOString().split('T')[0]}.cef"`,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'audit export failed');
    return NextResponse.json({ success: false, error: 'Failed to export audit logs' }, { status: 500 });
  }
}
