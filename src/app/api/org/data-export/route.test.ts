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

describe('GET /api/org/data-export (GDPR Art. 20 contract)', () => {
  let testOrgId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'export-test-org' },
      create: { slug: 'export-test-org', name: 'Export Test Org', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: testOrgId } });
  });

  it('returns 401 without a session', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const response = await GET(createRequest('/api/org/data-export'));
    expect(response.status).toBe(401);
  });

  it('returns 403 for non-admin roles', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', role: 'member', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/org/data-export'));
    expect(response.status).toBe(403);
  });

  it('returns a structured portable payload', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', email: 'u-1@example.com', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/org/data-export'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      schemaVersion: 1,
      exportedAt: expect.any(String),
      user: { id: 'u-1', email: 'u-1@example.com', role: 'admin' },
      organization: { id: testOrgId, name: 'Export Test Org', plan: 'agency' },
    });

    // Arrays present with counts
    for (const key of ['users', 'projects', 'violations', 'scans', 'auditLogs', 'teamInvites', 'customRoles']) {
      if (Array.isArray(body.data[key])) {
        expect(Array.isArray(body.data[key])).toBe(true);
      } else {
        expect(body.data[key]).toMatchObject({ count: expect.any(Number), items: expect.any(Array) });
      }
    }
  });

  it('never exposes sensitive fields', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-1', email: 'u-1@example.com', role: 'admin', orgId: testOrgId },
    } as never);

    const response = await GET(createRequest('/api/org/data-export'));
    const raw = JSON.stringify(await response.json());

    for (const sensitive of ['password', 'githubToken', 'mfaSecret', 'emailVerificationToken']) {
      expect(raw).not.toContain(sensitive);
    }
  });
});
