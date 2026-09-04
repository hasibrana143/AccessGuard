import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerIncident, resolveIncident, isPagerDutyConfigured } from '@/lib/pagerduty';
import { logger } from '@/lib/error-logger';

vi.mock('@/lib/error-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('PagerDuty Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('detects when PagerDuty routing key is not configured', () => {
    delete process.env.PAGERDUTY_ROUTING_KEY;
    delete process.env.PAGERDUTY_INTEGRATION_KEY;
    expect(isPagerDutyConfigured()).toBe(false);
  });

  it('safely handles unconfigured incident trigger without failing', async () => {
    delete process.env.PAGERDUTY_ROUTING_KEY;
    delete process.env.PAGERDUTY_INTEGRATION_KEY;

    const result = await triggerIncident({
      summary: 'Scan queue dead letter count exceeded',
      severity: 'critical',
      component: 'scanner-queue',
    });

    expect(result.success).toBe(true);
    expect(result.dedupKey).toBeDefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Scan queue dead letter count exceeded',
        severity: 'critical',
      }),
      expect.stringContaining('[PagerDuty Mock]')
    );
  });

  it('sends HTTP POST trigger payload to Events API v2 when configured', async () => {
    process.env.PAGERDUTY_ROUTING_KEY = 'pd_test_routing_key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({ status: 'success', dedup_key: 'custom-dedup-1' }),
    });
    global.fetch = fetchMock;

    const result = await triggerIncident({
      summary: 'PostgreSQL connection saturation',
      severity: 'critical',
      dedupKey: 'custom-dedup-1',
    });

    expect(result.success).toBe(true);
    expect(result.dedupKey).toBe('custom-dedup-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://events.pagerduty.com/v2/enqueue',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"routing_key":"pd_test_routing_key"'),
      })
    );
  });

  it('resolves an incident via Events API v2', async () => {
    process.env.PAGERDUTY_ROUTING_KEY = 'pd_test_routing_key';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
    });
    global.fetch = fetchMock;

    const result = await resolveIncident('custom-dedup-1', 'Postgres pool normalized');
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://events.pagerduty.com/v2/enqueue',
      expect.objectContaining({
        body: expect.stringContaining('"event_action":"resolve"'),
      })
    );
  });
});
