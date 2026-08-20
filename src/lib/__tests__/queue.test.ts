import { describe, expect, it, vi, beforeEach } from 'vitest';

const { processorRef, queueRef, FakeQueue } = vi.hoisted(() => {
  const processorRef: { current: ((job: unknown) => Promise<void>) | null } = { current: null };
  const queueRef: { current: FakeQueue | null } = { current: null };
  class FakeQueue {
    add = vi.fn(async () => ({ id: 'fake-job' }));
    getWaitingCount = vi.fn(async () => 1);
    getActiveCount = vi.fn(async () => 0);
    getCompletedCount = vi.fn(async () => 2);
    getFailedCount = vi.fn(async () => 1);
    async close() {}
  }
  return { processorRef, queueRef, FakeQueue };
});

vi.mock('bullmq', () => ({
  Queue: class extends FakeQueue {
    constructor(..._args: unknown[]) {
      super();
      queueRef.current = this;
    }
  },
Worker: class {
      constructor(_name: string, fn: (job: unknown) => Promise<void>) {
      processorRef.current = fn;
    }
    on() {}
    async close() {}
  },
}));

vi.mock('@/lib/redis', () => ({
  getRedis: vi.fn(),
  isRedisReady: vi.fn(() => true),
}));

vi.mock('@/lib/error-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/db', () => ({
  db: {
    project: {
      findUnique: vi.fn(async () => ({ id: 'project-1', orgId: 'org-1', name: 'Acme', url: 'https://acme.dev', isActive: true })),
      update: vi.fn(async () => ({})),
    },
    organization: {
      findUnique: vi.fn(async () => ({ id: 'org-1', plan: 'agency', settings: '{}' })),
    },
    scan: {
      create: vi.fn(async (args: unknown) => {
      const argsRecord = args as Record<string, unknown>;
      return { id: 'scan-1', ...(argsRecord.data as Record<string, unknown>) };
    }),
      update: vi.fn(async () => ({})),
    },
    violation: { createMany: vi.fn(async () => ({ count: 0 })) },
    auditLog: { create: vi.fn(async () => ({})) },
    user: { findMany: vi.fn(async () => [{ email: 'a@x.com' }]) },
  },
}));

vi.mock('@/lib/plan-limits', () => ({
  checkPagesLimit: vi.fn(),
}));

vi.mock('@/services/scanner', () => ({
  scanFromHTML: vi.fn(),
  scanUrl: vi.fn(),
  scanUrlServer: vi.fn(),
}));

import { getRedis } from '@/lib/redis';
import { checkPagesLimit } from '@/lib/plan-limits';
import { scanFromHTML } from '@/services/scanner';
import { db } from '@/lib/db';
import { enqueueScan, getQueueStatus, getScanQueue, startScanWorker, closeQueue } from '@/lib/queue';

const { mocked } = vi;

describe('queue', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await closeQueue();
    processorRef.current = null;
    queueRef.current = null;
    mocked(getRedis).mockReturnValue({} as never);
    mocked(checkPagesLimit).mockResolvedValue({ allowed: true, current: 1, limit: 100 });
    mocked(scanFromHTML).mockResolvedValue({
      pagesScanned: 1,
      violations: [
        { ruleId: 'image-alt', wcagCriteria: '1.1.1', severity: 'serious' as const, url: 'https://acme.dev', elementSelector: 'img', elementHtml: '<img src="a.jpg">', description: 'Missing alt', remediationCode: '<img src="a.jpg" alt="A">', aiExplanation: null, aiConfidenceScore: null, status: 'open' as const },
      ],
    });
  });

  describe('startScanWorker', () => {
    it('does not start a worker when redis is unavailable', () => {
      mocked(getRedis).mockReturnValue(null);
      startScanWorker();
      expect(processorRef.current).toBeNull();
    });

    it('registers a worker processor when redis is available', () => {
      startScanWorker();
      expect(processorRef.current).not.toBeNull();
    });

    it('marks the scan failed and records audit log when the page limit is reached', async () => {
      mocked(checkPagesLimit).mockResolvedValue({ allowed: false, current: 100, limit: 100 });
      startScanWorker();
      await expect(
        processorRef.current!({
          id: 'job-1',
          data: { projectId: 'project-1', url: 'https://acme.dev', useBrowser: false, html: '<div></div>' },
        })
      ).rejects.toThrow('Monthly scan limit reached');

      expect(db.scan.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) })
      );
      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'scan_blocked_plan_limit' }) })
      );
    });

    it('marks the running scan as failed when the scanner throws', async () => {
      mocked(scanFromHTML).mockRejectedValue(new Error('boom'));
      startScanWorker();
      await expect(
        processorRef.current!({
          id: 'job-1',
          data: { projectId: 'project-1', url: 'https://acme.dev', useBrowser: false, html: '<div></div>' },
        })
      ).rejects.toThrow('boom');

      expect(db.scan.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) })
      );
    });

    it('marks the running scan as failed when the scanner returns an error', async () => {
      mocked(scanFromHTML).mockResolvedValue({ error: '403 blocked', pagesScanned: 0, violations: [] });
      startScanWorker();
      await expect(
        processorRef.current!({
          id: 'job-1',
          data: { projectId: 'project-1', url: 'https://acme.dev', useBrowser: false, html: '<div></div>' },
        })
      ).rejects.toThrow('403 blocked');

      expect(db.scan.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) })
      );
    });

    it('completes a scan end to end on success', async () => {
      startScanWorker();
      await processorRef.current!({
        id: 'job-1',
        data: { projectId: 'project-1', url: 'https://acme.dev', useBrowser: false, html: '<div></div>' },
      });

      expect(db.violation.createMany).toHaveBeenCalled();
      expect(db.scan.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) })
      );
      expect(db.project.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ riskScore: expect.any(Number) }) })
      );
    });
  });

  describe('enqueueScan', () => {
    it('returns a job id when enqueued', async () => {
      const id = await enqueueScan('project-1', 'https://acme.dev', 'user-1', { html: '<div></div>' });
      expect(id).toBe('fake-job');
      expect(queueRef.current!.add).toHaveBeenCalledWith('execute-scan', expect.objectContaining({ projectId: 'project-1' }), expect.anything());
    });

    it('propagates queue failures', async () => {
      getScanQueue();
      queueRef.current!.add.mockRejectedValueOnce(new Error('redis down'));
      await expect(enqueueScan('project-1', 'https://acme.dev', 'user-1')).rejects.toThrow('redis down');
    });
  });

  describe('getQueueStatus / closeQueue', () => {
    it('returns queue counts', async () => {
      await expect(getQueueStatus()).resolves.toEqual({ waiting: 1, active: 0, completed: 2, failed: 1 });
    });

    it('closes and resets the queue', async () => {
      await expect(closeQueue()).resolves.toBeUndefined();
    });
  });
});
