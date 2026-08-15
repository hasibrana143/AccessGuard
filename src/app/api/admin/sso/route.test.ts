import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { GET, PATCH } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

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

const PEM = '-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END CERTIFICATE-----';

describe('GET/PATCH /api/admin/sso (contract)', () => {
  let testOrgId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'sso-test-org' },
      create: { slug: 'sso-test-org', name: 'SSO Test Org', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: testOrgId } });
  });

  it('GET returns 401 without a session', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const response = await GET(createRequest('/api/admin/sso'));
    expect(response.status).toBe(401);
  });

  it('GET returns 403 for non-admin roles', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'member', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/admin/sso'));
    expect(response.status).toBe(403);
  });

  it('GET returns disabled-by-default config without exposing the certificate', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/admin/sso'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      ssoEnabled: false,
      ssoProvider: null,
      certificateConfigured: false,
    });
    expect(JSON.stringify(body)).not.toContain('BEGIN CERTIFICATE');
  });

  it('PATCH rejects invalid provider', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/admin/sso', {
        method: 'PATCH',
        body: JSON.stringify({ ssoProvider: 'fortinet' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('PATCH rejects non-https entry point', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/admin/sso', {
        method: 'PATCH',
        body: JSON.stringify({ ssoEntryPoint: 'http://idp.example.com/sso' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('PATCH rejects malformed certificates', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/admin/sso', {
        method: 'PATCH',
        body: JSON.stringify({ ssoCertificate: 'not-a-pem' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('PATCH refuses to enable SSO without complete config', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/admin/sso', {
        method: 'PATCH',
        body: JSON.stringify({ ssoEnabled: true }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('PATCH saves config and emits an audit event', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/admin/sso', {
        method: 'PATCH',
        body: JSON.stringify({
          ssoEnabled: true,
          ssoProvider: 'okta',
          ssoIssuer: 'http://www.okta.com/exk1',
          ssoEntryPoint: 'https://acme.okta.com/app/accessguard/sso/saml',
          ssoCertificate: PEM,
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toMatchObject({
      ssoEnabled: true,
      ssoProvider: 'okta',
      ssoIssuer: 'http://www.okta.com/exk1',
      certificateConfigured: true,
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: testOrgId,
        action: 'sso.config_updated',
        metadata: expect.objectContaining({ provider: 'okta', enabled: true }),
      })
    );
  });

  it('PATCH can disable SSO and emits removal audit event', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await PATCH(
      createRequest('/api/admin/sso', {
        method: 'PATCH',
        body: JSON.stringify({ ssoEnabled: false }),
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.ssoEnabled).toBe(false);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: testOrgId, action: 'sso.config_removed' })
    );
  });
});
