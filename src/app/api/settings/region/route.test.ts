import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { GET, PATCH } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';
const mockedGetServerSession = vi.mocked(getServerSession);

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as RequestInit & { signal?: AbortSignal });
}

describe('GET/PATCH /api/settings/region (contract)', () => {
  let testOrgId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'region-test-org' },
      create: { slug: 'region-test-org', name: 'Region Test Org', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: testOrgId } });
  });

  it('GET returns 401 without a session', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const response = await GET(createRequest('/api/settings/region'));
    expect(response.status).toBe(401);
  });

  it('GET returns the org data region (default us)', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/settings/region'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, dataRegion: 'us' });
  });

  it('PATCH rejects non-admin roles', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'member', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/settings/region', {
        method: 'PATCH',
        body: JSON.stringify({ dataRegion: 'eu' }),
      })
    );
    expect(response.status).toBe(403);
  });

  it('PATCH rejects invalid region values', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/settings/region', {
        method: 'PATCH',
        body: JSON.stringify({ dataRegion: 'asia' }),
      })
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('Invalid region');
  });

  it('PATCH updates the region to eu and GET reflects it', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const patchResponse = await PATCH(
      createRequest('/api/settings/region', {
        method: 'PATCH',
        body: JSON.stringify({ dataRegion: 'eu' }),
      })
    );
    expect(patchResponse.status).toBe(200);
    expect(await patchResponse.json()).toMatchObject({ success: true, dataRegion: 'eu' });

    const getResponse = await GET(createRequest('/api/settings/region'));
    expect((await getResponse.json()).dataRegion).toBe('eu');
  });
});
