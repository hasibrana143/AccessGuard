import { db } from '@/lib/db';
import { logger } from '@/lib/error-logger';

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export const AUDIT_ACTIONS = [
  'user_login', 'user_logout', 'user_invited', 'user_removed',
  'project_created', 'project_updated', 'project_deleted',
  'scan_started', 'scan_completed', 'scan_failed',
  'violation_status_changed', 'violation_fixed',
  'manual_checks_updated',
  'settings_updated',
  'subscription_changed', 'subscription_created', 'subscription_cancelled',
  'github_connected', 'github_disconnected', 'github_connection_sync', 'github_pr_created',
  'report_generated', 'vpat_generated', 'executive_summary_generated',
  'remediation_generated', 'remediation_ai_cost',
  'email_verified', 'mfa_enabled', 'mfa_disabled',
  'api_key_regenerated', 'plan_limit_reached',
  'scan_scheduled', 'scan_unscheduled', 'scan_scheduled_triggered', 'scan_blocked_plan_limit',
  'usage_incremented',
  'custom_role_created', 'custom_role_updated', 'custom_role_deleted',
  'team_invite_cancelled',
  'sso_config_updated', 'sso_config_removed',
  'sso_login_success', 'sso_login_failure',
  'csp_violation_reported',
  'scim_token_generated', 'scim_user_created', 'scim_user_deactivated',
  'scim_group_created', 'scim_group_updated', 'scim_group_deleted',
  'cookie_consent_updated',
  'eu_data_transfer_consent',
  'payment_failed', 'payment_succeeded',
  'vendor_review',
  'api_key_created', 'api_key_revoked', 'api_scan_triggered', 'scan_auth_created', 'scan_auth_updated', 'scan_auth_deleted',
  'integration_created', 'integration_updated', 'integration_deleted',
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
 * Create an audit log entry.
 *
 * Returns true when the entry was written. A failure is logged but never
 * thrown (an audit outage must not break the flow that was audited), so a
 * caller that has to report the state of the trail — a pull request that now
 * exists on GitHub — has to check the return value instead of assuming success.
 */
export async function createAuditLog(input: AuditLogInput): Promise<boolean> {
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
    return true;
  } catch (error) {
    logger.error(
      { err: error, action: input.action, orgId: input.orgId },
      'Audit log write failed'
    );
    return false;
  }
}

/**
 * Write an audit entry and retry a transient database failure.
 *
 * A repository mutation (a pull request that now exists on GitHub) must not
 * leave the organization without a trail. The write is attempted a few times
 * with a growing delay before the caller is told that the entry is missing.
 */
export async function createAuditLogWithRetry(
  input: AuditLogInput,
  attempts = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (await createAuditLog(input)) return true;
    if (attempt < attempts) {
      await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }
  return false;
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
