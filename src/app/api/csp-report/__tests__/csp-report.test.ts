import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/error-logger';

vi.mock('@/lib/error-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: 3600 }),
  getClientIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitResponse: vi.fn(),
  rateLimits: { default: { interval: 60000, limit: 100 } },
}));

describe('POST /api/csp-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('receives standard application/csp-report payload and logs warning', async () => {
    const reportData = {
      'csp-report': {
        'document-uri': 'https://accessguard.io/dashboard',
        'blocked-uri': 'http://evil.com/malicious.js',
        'violated-directive': 'script-src',
        'original-policy': "default-src 'self'",
      },
    };

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/csp-report' },
      body: JSON.stringify(reportData),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        blockedUri: 'http://evil.com/malicious.js',
        violatedDirective: 'script-src',
        documentUri: 'https://accessguard.io/dashboard',
      }),
      'CSP violation reported'
    );
  });

  it('handles raw JSON violation report', async () => {
    const reportData = {
      blockedURI: 'inline',
      violatedDirective: 'style-src-elem',
      documentURI: 'https://accessguard.io/projects',
    };

    const req = new NextRequest('http://localhost:3000/api/csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(reportData),
    });

    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        blockedUri: 'inline',
        violatedDirective: 'style-src-elem',
      }),
      'CSP violation reported'
    );
  });
});
