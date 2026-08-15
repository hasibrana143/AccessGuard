import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scoreOrg, riskBand, computeChurnScores } from '@/lib/churn';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    organization: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/error-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const now = new Date('2026-08-16T00:00:00Z');
const days = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe('scoreOrg (churn signals)', () => {
  it('scores 0 for a healthy org (recent scan + activity + active billing)', () => {
    const result = scoreOrg(
      { subscriptionStatus: 'active', lastScanAt: days(2), hasRecentActivity: true },
      now
    );
    expect(result).toMatchObject({ noRecentScan: false, noRecentActivity: false, billingTrouble: false, score: 0 });
  });

  it('adds +3 when no scan in 30 days', () => {
    const result = scoreOrg(
      { subscriptionStatus: 'active', lastScanAt: days(40), hasRecentActivity: true },
      now
    );
    expect(result.noRecentScan).toBe(true);
    expect(result.score).toBe(3);
  });

  it('adds +3 when org never scanned', () => {
    const result = scoreOrg(
      { subscriptionStatus: 'active', lastScanAt: null, hasRecentActivity: true },
      now
    );
    expect(result.noRecentScan).toBe(true);
    expect(result.score).toBe(3);
  });

  it('adds +2 when no audit activity in 30 days', () => {
    const result = scoreOrg(
      { subscriptionStatus: 'active', lastScanAt: days(2), hasRecentActivity: false },
      now
    );
    expect(result.noRecentActivity).toBe(true);
    expect(result.score).toBe(2);
  });

  it('adds +4 for past_due billing', () => {
    const result = scoreOrg(
      { subscriptionStatus: 'past_due', lastScanAt: days(2), hasRecentActivity: true },
      now
    );
    expect(result.billingTrouble).toBe(true);
    expect(result.score).toBe(4);
  });

  it('adds +4 for unpaid billing', () => {
    const result = scoreOrg(
      { subscriptionStatus: 'unpaid', lastScanAt: days(2), hasRecentActivity: true },
      now
    );
    expect(result.billingTrouble).toBe(true);
    expect(result.score).toBe(4);
  });

  it('stacks signals (idle + inactive + past_due = 9)', () => {
    const result = scoreOrg(
      { subscriptionStatus: 'past_due', lastScanAt: null, hasRecentActivity: false },
      now
    );
    expect(result.score).toBe(9);
  });
});

describe('riskBand', () => {
  it('classifies bands at the spec thresholds', () => {
    expect(riskBand(0)).toBe('healthy');
    expect(riskBand(4)).toBe('healthy');
    expect(riskBand(5)).toBe('at-risk');
    expect(riskBand(7)).toBe('at-risk');
    expect(riskBand(8)).toBe('high-risk');
    expect(riskBand(9)).toBe('high-risk');
  });
});

describe('computeChurnScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('persists changed scores and returns the change count', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([
      {
        id: 'org-1',
        subscriptionStatus: 'active',
        projects: [{ lastScanAt: days(2) }],
        _count: { auditLogs: 5 },
      },
      {
        id: 'org-2',
        subscriptionStatus: 'active',
        projects: [{ lastScanAt: null }],
        _count: { auditLogs: 0 },
      },
    ] as never);

    vi.mocked(db.organization.updateMany).mockResolvedValue({ count: 1 } as never);

    const changed = await computeChurnScores(now);

    expect(changed).toBe(2);
    expect(db.organization.updateMany).toHaveBeenCalledTimes(2);
    expect(db.organization.updateMany).toHaveBeenCalledWith({
      where: { id: 'org-2', churnScore: { not: 5 } },
      data: { churnScore: 5, lastChurnCalcAt: now },
    });
  });

  it('returns 0 when no orgs exist', async () => {
    vi.mocked(db.organization.findMany).mockResolvedValue([] as never);
    const changed = await computeChurnScores(now);
    expect(changed).toBe(0);
    expect(db.organization.updateMany).not.toHaveBeenCalled();
  });
});
