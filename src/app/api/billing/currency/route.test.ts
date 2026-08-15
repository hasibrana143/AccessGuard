import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET, PATCH } from './route';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { createAuditLog } from '@/lib/audit';
const mockedGetServerSession = vi.mocked(getServerSession);

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as RequestInit & { signal?: AbortSignal });
}

describe('GET/PATCH /api/billing/currency (contract)', () => {
  let testOrgId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'currency-test-org' },
      create: { slug: 'currency-test-org', name: 'Currency Test Org', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: testOrgId } });
  });

  it('GET returns 401 without a session', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const response = await GET(createRequest('/api/billing/currency'));
    expect(response.status).toBe(401);
  });

  it('GET returns default usd + FX snapshot', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'member', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/billing/currency'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.currency).toBe('usd');
    expect(body.data.symbol).toBe('$');
    expect(body.data.rates.inr).toBeCloseTo(83.5);
    expect(body.data.supported).toEqual(expect.arrayContaining(['usd', 'eur', 'gbp', 'inr']));
  });

  it('PATCH returns 403 for non-admin roles', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'member', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/billing/currency', {
        method: 'PATCH',
        body: JSON.stringify({ currency: 'eur' }),
      })
    );
    expect(response.status).toBe(403);
  });

  it('PATCH rejects unsupported currencies', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/billing/currency', {
        method: 'PATCH',
        body: JSON.stringify({ currency: 'jpy' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('PATCH updates currency and emits audit', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/billing/currency', {
        method: 'PATCH',
        body: JSON.stringify({ currency: 'inr' }),
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.currency).toBe('inr');
    expect(body.data.symbol).toBe('₹');

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: testOrgId,
        action: 'settings.updated',
        metadata: expect.objectContaining({ field: 'billing.currency', value: 'inr' }),
      })
    );
  });

  it('PATCH persists to the database', async () => {
    const org = await db.organization.findUnique({ where: { id: testOrgId } });
    expect(org?.currency).toBe('inr');
  });
});
