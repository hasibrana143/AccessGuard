import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureAnalytics, identifyUser, isPostHogConfigured } from '@/lib/posthog';
import { logger } from '@/lib/error-logger';

vi.mock('@/lib/error-logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('PostHog Analytics Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports not configured when env keys are absent', () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.POSTHOG_API_KEY;
    expect(isPostHogConfigured()).toBe(false);
  });

  it('safely logs to debug logger when PostHog is unconfigured without throwing', async () => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.POSTHOG_API_KEY;

    const result = await captureAnalytics('scan_completed', {
      projectId: 'proj-123',
      violationCount: 5,
    });

    expect(result).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'scan_completed',
        properties: expect.objectContaining({ violationCount: 5 }),
      }),
      expect.stringContaining('[Analytics Mock]')
    );
  });

  it('dispatches HTTP POST capture request when configured', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key_123';
    process.env.POSTHOG_HOST = 'https://app.posthog.com';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock;

    const result = await captureAnalytics('project_created', { orgId: 'org-1' }, 'user-456');

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.posthog.com/capture/',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"event":"project_created"'),
      })
    );
  });

  it('dispatches identify user request when configured', async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key_123';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock;

    const result = await identifyUser('user-789', { email: 'test@domain.com', plan: 'growth' });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/capture/'),
      expect.objectContaining({
        body: expect.stringContaining('"event":"$identify"'),
      })
    );
  });
});
