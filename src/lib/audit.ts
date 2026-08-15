import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export const AUDIT_ACTIONS = [
  'user.login', 'user.logout', 'user.invited', 'user.removed',
  'project.created', 'project.updated', 'project.deleted',
  'scan.started', 'scan.completed', 'scan.failed',
  'violation.status_changed', 'violation.fixed',
  'settings.updated', 'settings_updated',
  'subscription.changed', 'subscription.created', 'subscription.cancelled',
  'payment_succeeded', 'payment_failed',
  'github.connected', 'github.disconnected', 'github.connection_sync',
  'github_connected', 'github_disconnected', 'github_pr_created',
  'report.generated', 'report_generated', 'vpat_generated', 'executive_summary_generated',
  'remediation.generated', 'remediation.ai_cost',
  'email_verified', 'mfa_enabled', 'mfa_disabled',
  'api_key_regenerated', 'plan_limit_reached',
  'scan_scheduled', 'scan_unscheduled', 'scan_scheduled_triggered', 'scan_blocked_plan_limit',
  'custom_role_created', 'custom_role_updated', 'custom_role_deleted',
  'team_invite_cancelled',
  'sso.config_updated', 'sso.config_removed',
] as const;

interface AuditLogInput {
  orgId: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        orgId: input.orgId,
        action: input.action,
        metadata: JSON.stringify({
          ...input.metadata,
          userId: input.userId,
          ip: input.ip,
          userAgent: input.userAgent,
          timestamp: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    logger.error({ err: error }, '');
    // Don't throw - audit log failures shouldn't break the main flow
  }
}

/**
 * Get audit logs for an organization
 */
export async function getAuditLogs(
  orgId: string,
  options?: {
    action?: AuditAction;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const where: Record<string, unknown> = { orgId };

  if (options?.action) {
    where.action = options.action;
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options?.startDate) {
      (where.createdAt as Record<string, Date>).gte = options.startDate;
    }
    if (options?.endDate) {
      (where.createdAt as Record<string, Date>).lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      metadata: JSON.parse(log.metadata),
    })),
    total,
  };
}

/**
 * Export audit logs as CSV (for compliance reports)
 */
export function exportAuditLogsAsCsv(logs: Array<{ metadata: string } & Record<string, unknown>>): string {
  const headers = ['Timestamp', 'Action', 'User ID', 'Details'];
  const rows = logs.map((log) => {
    const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
    return [
      (log as Record<string, unknown>).createdAt,
      (log as Record<string, unknown>).action,
      metadata.userId || 'N/A',
      JSON.stringify(metadata),
    ];
  });

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}
