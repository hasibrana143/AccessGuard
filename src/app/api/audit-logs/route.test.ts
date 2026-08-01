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

describe('GET /api/audit-logs (contract)', () => {
  let testOrgId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'test-org' },
      create: { slug: 'test-org', name: 'Test Organization', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;

    await db.auditLog.create({
      data: {
        orgId: testOrgId,
        action: 'contract_test_created',
        metadata: JSON.stringify({ marker: 'contract' }),
      },
    });
  });

  afterAll(async () => {
    await db.auditLog.deleteMany({ where: { orgId: testOrgId, action: 'contract_test_created' } });
  });

  it('returns 401 without a session', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const response = await GET(createRequest('/api/audit-logs'));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, error: 'Unauthorized' });
  });

  it('returns audit logs with the documented response shape', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/audit-logs'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.total).toBe('number');

    const log = body.data.find((l: { action: string }) => l.action === 'contract_test_created');
    expect(log).toBeDefined();
    expect(log).toMatchObject({
      id: expect.any(String),
      action: 'contract_test_created',
      createdAt: expect.any(String),
      metadata: { marker: 'contract' },
    });
  });

  it('filters by action parameter', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/audit-logs?action=contract_test_created&limit=10'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.every((l: { action: string }) => l.action === 'contract_test_created')).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(10);
  });
});
