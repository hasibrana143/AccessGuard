import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET } from './route';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';
const mockedGetServerSession = vi.mocked(getServerSession);

// Regression test: the project detail UI calls GET /api/projects/[id] but
// the route never existed — every detail page rendered "Not Found".
describe('Project detail API (contract)', () => {
  let testOrgId: string;
  let testUserId: string;
  let projectId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'project-detail-test-org' },
      create: { slug: 'project-detail-test-org', name: 'Project Detail Test Org', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;
    const user = await db.user.upsert({
      where: { email: 'project-detail@accessguard.dev' },
      create: {
        email: 'project-detail@accessguard.dev',
        name: 'Project Detail Tester',
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
      data: { orgId: testOrgId, name: 'Detail Fixture', url: 'https://detail.example.com' },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await db.project.deleteMany({ where: { orgId: testOrgId } });
    await db.user.deleteMany({ where: { id: testUserId } });
    await db.organization.deleteMany({ where: { id: testOrgId } });
  });

  const get = (id: string) =>
    GET(
      new NextRequest(new URL(`/api/projects/${id}`, 'http://localhost:3000')),
      { params: Promise.resolve({ id }) }
    );

  it('returns the project for org members', async () => {
    const response = await get(projectId);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.name).toBe('Detail Fixture');
    expect(body.data.url).toBe('https://detail.example.com');
  });

  it('returns 404 for missing projects', async () => {
    const response = await get('nonexistent-id');
    expect(response.status).toBe(404);
  });

  it('returns 401 without a session', async () => {
    mockedGetServerSession.mockResolvedValue(null);
    const response = await get(projectId);
    expect(response.status).toBe(401);
    mockedGetServerSession.mockResolvedValue({
      user: { id: testUserId, email: 'x', role: 'admin', orgId: testOrgId, orgSlug: 'x' },
    } as never);
  });
});
