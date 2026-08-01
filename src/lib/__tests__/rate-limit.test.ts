import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/redis', () => ({
  getRedis: vi.fn(() => null),
  isRedisReady: vi.fn(() => false),
}));

import { checkRateLimit, getClientIdentifier, createRateLimitResponse, rateLimits } from '@/lib/rate-limit';

describe('rate-limit (in-memory fallback)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('allows the first request and reports remaining quota', async () => {
    const result = await checkRateLimit('ip-1', { interval: 60000, limit: 3 });
    expect(result.success).toBe(true);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests once the limit is exceeded', async () => {
    const config = { interval: 60000, limit: 2 };
    await checkRateLimit('ip-2', config);
    await checkRateLimit('ip-2', config);
    const blocked = await checkRateLimit('ip-2', config);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets the counter after the interval elapses', async () => {
    const config = { interval: 50, limit: 1 };
    await checkRateLimit('ip-3', config);
    const blocked = await checkRateLimit('ip-3', config);
    expect(blocked.success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 80));
    const allowed = await checkRateLimit('ip-3', config);
    expect(allowed.success).toBe(true);
  });

  it('tracks different identifiers independently', async () => {
    const config = { interval: 60000, limit: 1 };
    await checkRateLimit('ip-a', config);
    const other = await checkRateLimit('ip-b', config);
    expect(other.success).toBe(true);
  });

  it('uses the default limits when no config is provided', async () => {
    await expect(checkRateLimit('ip-c')).resolves.toMatchObject({ limit: rateLimits.default.limit });
  });
});

describe('getClientIdentifier', () => {
  it('prefers the first x-forwarded-for address', () => {
    const req = new Request('https://x.dev', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
    expect(getClientIdentifier(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('https://x.dev', { headers: { 'x-real-ip': '9.9.9.9' } });
    expect(getClientIdentifier(req)).toBe('9.9.9.9');
  });

  it('falls back to cf-connecting-ip', () => {
    const req = new Request('https://x.dev', { headers: { 'cf-connecting-ip': '8.8.8.8' } });
    expect(getClientIdentifier(req)).toBe('8.8.8.8');
  });

  it('returns anonymous when no headers are present', () => {
    expect(getClientIdentifier(new Request('https://x.dev'))).toBe('anonymous');
  });
});

describe('createRateLimitResponse', () => {
  it('returns a 429 with rate limit headers', () => {
    const res = createRateLimitResponse({ success: false, limit: 10, remaining: 0, reset: Date.now() + 30_000 });
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('Retry-After')).toBe('30');
    expect(res.headers.get('Content-Type')).toContain('application/json');
  });
});
