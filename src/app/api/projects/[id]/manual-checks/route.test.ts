import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET, PUT } from './route';
import { MANUAL_CHECKS } from '@/lib/manual-checks';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';
const mockedGetServerSession = vi.mocked(getServerSession);

function authedRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as RequestInit & { signal?: AbortSignal });
}

const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) });

describe('Manual checks API (contract)', () => {
  let testOrgId: string;
  let testUserId: string;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'manual-checks-test-org' },
      create: { slug: 'manual-checks-test-org', name: 'Manual Checks Test Org', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;
    const user = await db.user.upsert({
      where: { email: 'manual-checks@accessguard.dev' },
      create: {
        email: 'manual-checks@accessguard.dev',
        name: 'Manual Checks Tester',
        password: 'not-used',
        role: 'admin',
        orgId: testOrgId,
        emailVerifiedAt: new Date(),
      },
      update: { emailVerifiedAt: new Date() },
    });
    testUserId = user.id;
    mockedGetServerSession.mockResolvedValue({
      user: { id: testUserId, email: user.email, role: 'admin', orgId: testOrgId, orgSlug: org.slug },
    } as never);

    const project = await db.project.create({
      data: { orgId: testOrgId, name: 'Manual Checks Fixture', url: 'https://manual.example.com' },
    });
    projectId = project.id;

    const otherOrg = await db.organization.upsert({
      where: { slug: 'manual-checks-other-org' },
      create: { slug: 'manual-checks-other-org', name: 'Other Org', plan: 'free' },
      update: {},
    });
    const other = await db.project.create({
      data: { orgId: otherOrg.id, name: 'Foreign Fixture', url: 'https://foreign.example.com' },
    });
    otherProjectId = other.id;
  });

  afterAll(async () => {
    await db.manualCheck.deleteMany({ where: { project: { orgId: testOrgId } } });
    await db.project.deleteMany({ where: { orgId: { in: [testOrgId] } } });
    await db.user.deleteMany({ where: { id: testUserId } });
    await db.organization.deleteMany({ where: { slug: { in: ['manual-checks-test-org', 'manual-checks-other-org'] } } });
  });

  it('GET returns the full catalog as pending', async () => {
    const response = await GET(authedRequest(`/api/projects/${projectId}/manual-checks`), paramsFor(projectId));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(MANUAL_CHECKS.length);
    expect(body.data.every((c: { status: string }) => c.status === 'pending')).toBe(true);
    expect(body.data[0]).toHaveProperty('wcag');
    expect(body.data[0]).toHaveProperty('stepsEn');
  });

  it('PUT saves outcomes and GET reflects them', async () => {
    const put = await PUT(
      authedRequest(`/api/projects/${projectId}/manual-checks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: [
            { checkId: 'keyboard-flow', status: 'pass' },
            { checkId: 'zoom-200', status: 'fail', notes: 'Nav overlaps at 200%' },
          ],
        }),
      }),
      paramsFor(projectId)
    );
    expect(put.status).toBe(200);

    const get = await GET(authedRequest(`/api/projects/${projectId}/manual-checks`), paramsFor(projectId));
    const data = (await get.json()).data as Array<{ id: string; status: string; notes: string | null }>;
    expect(data.find((c) => c.id === 'keyboard-flow')?.status).toBe('pass');
    expect(data.find((c) => c.id === 'zoom-200')?.status).toBe('fail');
    expect(data.find((c) => c.id === 'zoom-200')?.notes).toBe('Nav overlaps at 200%');

    const audit = await db.auditLog.findFirst({
      where: { orgId: testOrgId, action: 'manual_checks_updated' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
  });

  it('PUT rejects unknown checkId and bad status', async () => {
    const badId = await PUT(
      authedRequest(`/api/projects/${projectId}/manual-checks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: [{ checkId: 'nope', status: 'pass' }] }),
      }),
      paramsFor(projectId)
    );
    expect(badId.status).toBe(400);

    const badStatus = await PUT(
      authedRequest(`/api/projects/${projectId}/manual-checks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: [{ checkId: 'keyboard-flow', status: 'maybe' }] }),
      }),
      paramsFor(projectId)
    );
    expect(badStatus.status).toBe(400);
  });

  it('rejects unauthenticated callers and foreign projects', async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const anon = await GET(authedRequest(`/api/projects/${projectId}/manual-checks`), paramsFor(projectId));
    expect(anon.status).toBe(401);

    mockedGetServerSession.mockResolvedValue({
      user: { id: testUserId, email: 'manual-checks@accessguard.dev', role: 'admin', orgId: testOrgId, orgSlug: 'x' },
    } as never);
    const foreign = await GET(
      authedRequest(`/api/projects/${otherProjectId}/manual-checks`),
      paramsFor(otherProjectId)
    );
    expect([403, 404]).toContain(foreign.status);
  });
});
