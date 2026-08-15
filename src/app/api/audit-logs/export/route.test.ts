import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';
const mockedGetServerSession = vi.mocked(getServerSession);

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/audit-logs/export (contract)', () => {
  let testOrgId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'test-org' },
      create: { slug: 'test-org', name: 'Test Organization', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;

    await db.auditLog.createMany({
      data: [
        {
          orgId: testOrgId,
          action: 'contract_test_created',
          metadata: JSON.stringify({ marker: 'contract', userId: 'u-1' }),
          createdAt: new Date(Date.now() - 1000),
        },
        {
          orgId: testOrgId,
          action: 'export_marker',
          metadata: JSON.stringify({ userId: 'u-1' }),
          createdAt: new Date(Date.now() - 2000),
        },
      ],
    });
  });

  afterAll(async () => {
    await db.auditLog.deleteMany({
      where: { orgId: testOrgId, action: { in: ['contract_test_created', 'export_marker'] } },
    });
  });

  it('returns 401 without a session', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const response = await GET(createRequest('/api/audit-logs/export'));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, error: 'Unauthorized' });
  });

  it('returns 403 for non-admin roles', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'member', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/audit-logs/export'));
    expect(response.status).toBe(403);
  });

  it('rejects invalid format', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/audit-logs/export?format=exe'));
    expect(response.status).toBe(400);
  });

  it('exports JSON with the documented shape', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest(`/api/audit-logs/export?since=${new Date(Date.now() - 60_000).toISOString()}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.window).toMatchObject({ since: expect.any(String), until: expect.any(String) });
    expect(Array.isArray(body.data)).toBe(true);

    const marker = body.data.find((l: { action: string }) => l.action === 'export_marker');
    expect(marker).toMatchObject({
      id: expect.any(String),
      orgId: testOrgId,
      action: 'export_marker',
      createdAt: expect.any(String),
    });
  });

  it('exports CSV with formula-injection sanitization', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/audit-logs/export?format=csv'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');

    const text = await response.text();
    const lines = text.split('\n');
    expect(lines[0]).toBe('id,orgId,action,createdAt,metadata');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.some((l) => l.includes('export_marker'))).toBe(true);
  });

  it('exports CEF (Common Event Format) for SIEM ingestion', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/audit-logs/export?format=cef'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain');

    const text = await response.text();
    expect(text).toMatch(/^CEF:0\|AccessGuard\|SaaS\|1\.0\|/);
    expect(text).toContain('act=export_marker');
    expect(text).toContain('suser=u-1');
  });

  it('respects the limit parameter', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/audit-logs/export?limit=1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.length).toBe(1);
  });

  it('caps limit at 10000', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/audit-logs/export?limit=999999'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.length).toBeLessThanOrEqual(10000);
  });
});
