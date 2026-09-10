import { db } from './db';
import { logger } from './error-logger';

// Data-retention sweeps (PRD §7.4). Age-based hard deletes; idempotent by
// construction (same cutoff re-run deletes nothing new). Only terminal scan
// states are ever removed — pending/running scans are always kept.

export interface RetentionConfig {
  scansDays: number;
  auditDays: number;
  authDays: number;
}

export interface RetentionResult {
  scans: number;
  auditLogs: number;
  passwordResets: number;
  teamInvites: number;
  ranAt: string;
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function retentionConfig(): RetentionConfig {
  return {
    scansDays: numEnv('RETENTION_SCANS_DAYS', 365),
    auditDays: numEnv('RETENTION_AUDIT_DAYS', 730),
    authDays: numEnv('RETENTION_AUTH_DAYS', 30),
  };
}

const TERMINAL_SCAN = ['completed', 'failed'] as const;

export async function runRetentionSweep(
  config: RetentionConfig = retentionConfig(),
  now: Date = new Date()
): Promise<RetentionResult> {
  const scansCutoff = new Date(now.getTime() - config.scansDays * 24 * 60 * 60 * 1000);
  const auditCutoff = new Date(now.getTime() - config.auditDays * 24 * 60 * 60 * 1000);
  const authCutoff = new Date(now.getTime() - config.authDays * 24 * 60 * 60 * 1000);

  // Violations cascade from scans (onDelete: Cascade on scanId + projectId).
  const scans = await db.scan.deleteMany({
    where: {
      status: { in: [...TERMINAL_SCAN] },
      completedAt: { lt: scansCutoff },
    },
  });

  const auditLogs = await db.auditLog.deleteMany({
    where: { createdAt: { lt: auditCutoff } },
  });

  const passwordResets = await db.passwordReset.deleteMany({
    where: { expiresAt: { lt: authCutoff } },
  });

  const teamInvites = await db.teamInvite.deleteMany({
    where: {
      OR: [{ acceptedAt: { not: null }, createdAt: { lt: authCutoff } }, { expiresAt: { lt: authCutoff } }],
    },
  });

  const result: RetentionResult = {
    scans: scans.count,
    auditLogs: auditLogs.count,
    passwordResets: passwordResets.count,
    teamInvites: teamInvites.count,
    ranAt: now.toISOString(),
  };
  logger.info({ ...result, ...config }, 'Retention sweep completed');
  return result;
}

// Self-gating wrapper for the daemon tick: at most one sweep per interval.
let lastSweepAt = 0;

export function retentionSweepIntervalMs(): number {
  const raw = process.env.RETENTION_SWEEP_INTERVAL_HOURS;
  const hours = raw === undefined || raw === '' ? 24 : Number(raw);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 60 * 60 * 1000;
}

export async function maybeRunRetentionSweep(now: number = Date.now()): Promise<RetentionResult | null> {
  if (now - lastSweepAt < retentionSweepIntervalMs()) return null;
  lastSweepAt = now;
  return runRetentionSweep();
}
