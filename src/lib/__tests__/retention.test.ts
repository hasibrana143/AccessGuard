import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { runRetentionSweep, maybeRunRetentionSweep } from '@/lib/retention';

describe('retention sweep', () => {
  let orgId: string;
  let projectId: string;
  let oldScanId: string;

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'retention-test-org' },
      create: { slug: 'retention-test-org', name: 'Retention Test Org', plan: 'free' },
      update: {},
    });
    orgId = org.id;
    const project = await db.project.create({
      data: { orgId, name: 'Retention Fixture', url: 'https://retention.example.com' },
    });
    projectId = project.id;

    // Old completed scan with a violation (cascade target).
    const oldScan = await db.scan.create({
      data: {
        projectId,
        status: 'completed',
        startedAt: daysAgo(400),
        completedAt: daysAgo(400),
        createdAt: daysAgo(400),
      },
    });
    oldScanId = oldScan.id;
    await db.violation.create({
      data: {
        scanId: oldScanId,
        projectId,
        ruleId: 'image-alt',
        severity: 'serious',
        url: 'https://retention.example.com/old',
        description: 'Old fixture violation',
        createdAt: daysAgo(400),
      },
    });

    // Recent completed scan (must survive) + old RUNNING scan (must survive).
    await db.scan.create({
      data: { projectId, status: 'completed', startedAt: daysAgo(5), completedAt: daysAgo(5) },
    });
    await db.scan.create({
      data: { projectId, status: 'running', startedAt: daysAgo(400) },
    });

    await db.auditLog.create({
      data: { orgId, action: 'scan_completed', metadata: '{}', createdAt: daysAgo(800) },
    });
    await db.passwordReset.create({
      data: { email: 'retention@example.com', token: 'retention-token-1', expiresAt: daysAgo(60) },
    });
    await db.teamInvite.create({
      data: {
        orgId,
        email: 'retention@example.com',
        role: 'member',
        token: 'retention-invite-1',
        invitedBy: null,
        expiresAt: daysAgo(60),
      },
    });
  });

  afterAll(async () => {
    await db.passwordReset.deleteMany({ where: { email: { startsWith: 'retention' } } });
    await db.teamInvite.deleteMany({ where: { email: { startsWith: 'retention' } } });
    await db.organization.deleteMany({ where: { id: orgId } });
  });

  it('deletes terminal scans past the window (violations cascade) and keeps the rest', async () => {
    const result = await runRetentionSweep({ scansDays: 365, auditDays: 730, authDays: 30 });
    expect(result.scans).toBe(1);

    expect(await db.scan.findUnique({ where: { id: oldScanId } })).toBeNull();
    expect(await db.violation.findFirst({ where: { scanId: oldScanId } })).toBeNull();
    expect(await db.scan.count({ where: { projectId, status: 'completed' } })).toBe(1);
    expect(await db.scan.count({ where: { projectId, status: 'running' } })).toBe(1);
  });

  it('prunes old audit logs, expired resets and invites', async () => {
    // Fresh fixtures: test 1's sweep already consumed the beforeAll rows.
    await db.auditLog.create({
      data: { orgId, action: 'scan_completed', metadata: '{}', createdAt: daysAgo(800) },
    });
    await db.passwordReset.create({
      data: { email: 'retention2@example.com', token: 'retention-token-2', expiresAt: daysAgo(60) },
    });
    await db.teamInvite.create({
      data: {
        orgId,
        email: 'retention2@example.com',
        role: 'member',
        token: 'retention-invite-2',
        invitedBy: null,
        expiresAt: daysAgo(60),
      },
    });
    const result = await runRetentionSweep({ scansDays: 365, auditDays: 730, authDays: 30 });
    expect(result.auditLogs).toBe(1);
    expect(result.passwordResets).toBe(1);
    expect(result.teamInvites).toBe(1);
  });

  it('is idempotent on re-run and self-gates the daemon wrapper', async () => {
    const again = await runRetentionSweep({ scansDays: 365, auditDays: 730, authDays: 30 });
    expect(again).toEqual(
      expect.objectContaining({ scans: 0, auditLogs: 0, passwordResets: 0, teamInvites: 0 })
    );
    const gated = await maybeRunRetentionSweep();
    expect(gated === null || typeof gated.scans === 'number').toBe(true);
    // Second immediate call must be gated off.
    await maybeRunRetentionSweep();
    expect(await maybeRunRetentionSweep()).toBeNull();
  });
});
