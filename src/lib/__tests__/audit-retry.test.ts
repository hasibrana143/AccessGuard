import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: { auditLog: { create: mocks.create } },
}));

vi.mock('@/lib/error-logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { createAuditLogWithRetry } from '@/lib/audit';

const entry = { orgId: 'org-1', action: 'github_pr_created' as const, metadata: { prUrl: 'https://github.com/o/r/pull/1' } };

describe('createAuditLogWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries a failed write and reports that the entry was recorded', async () => {
    mocks.create
      .mockRejectedValueOnce(new Error('database down'))
      .mockRejectedValueOnce(new Error('database down'))
      .mockResolvedValue({});

    const recorded = await createAuditLogWithRetry(entry);

    expect(recorded).toBe(true);
    expect(mocks.create).toHaveBeenCalledTimes(3);
  });

  it('gives up after the attempts and reports that the entry is missing', async () => {
    mocks.create.mockRejectedValue(new Error('database down'));

    const recorded = await createAuditLogWithRetry(entry, 2);

    expect(recorded).toBe(false);
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });
});
