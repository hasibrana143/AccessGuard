import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './scan/route';
import { GET } from './vpat/route';

vi.mock('@/services/scanner', () => ({
  scanUrl: vi.fn(async () => ({
    violations: [],
    pagesScanned: 1,
  })),
}));

vi.mock('@/lib/vpat-generator', () => ({
  generateVPATData: vi.fn(async () => ({
    meta: { projectId: 'temp' },
    summary: {},
  })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    organization: { upsert: vi.fn(async () => ({})) },
  },
}));

function scanRequest(ip: string): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/onboarding/scan'), {
    method: 'POST',
    body: JSON.stringify({ url: 'https://example.com' }),
    headers: { 'Content-Type': 'application/json', 'x-real-ip': ip },
  });
}

function vpatRequest(ip: string): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/onboarding/vpat?url=https://example.com'), {
    headers: { 'x-real-ip': ip },
  });
}

// Unique per run so a Redis-backed counter from an earlier run cannot leak in.
function uniqueIp(): string {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

describe('public onboarding endpoints (compute-abuse guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows 5 scans per client and rejects the 6th with 429', async () => {
    const ip = uniqueIp();

    for (let i = 0; i < 5; i++) {
      const response = await POST(scanRequest(ip));
      expect(response.status).toBe(200);
    }

    const blocked = await POST(scanRequest(ip));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(await blocked.json()).toMatchObject({ success: false, error: expect.stringContaining('Too many requests') });
  });

  it('scopes the limit per client', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 5; i++) {
      await POST(scanRequest(ip));
    }
    expect((await POST(scanRequest(ip))).status).toBe(429);

    const other = await POST(scanRequest(uniqueIp()));
    expect(other.status).toBe(200);
  });

  it('shares one budget between /onboarding/scan and /onboarding/vpat', async () => {
    const ip = uniqueIp();

    for (let i = 0; i < 3; i++) {
      expect((await POST(scanRequest(ip))).status).toBe(200);
    }
    for (let i = 0; i < 2; i++) {
      expect((await GET(vpatRequest(ip))).status).toBe(200);
    }

    // Sixth request across both endpoints — switching routes must not reset it.
    expect((await GET(vpatRequest(ip))).status).toBe(429);
    expect((await POST(scanRequest(ip))).status).toBe(429);
  });
});
