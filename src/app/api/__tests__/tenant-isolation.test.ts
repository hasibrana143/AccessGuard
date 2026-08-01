import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { vi } from 'vitest';
import { getServerSession } from 'next-auth';
const mockedGetServerSession = vi.mocked(getServerSession);

import { GET as getProjects, POST as postProjects, DELETE as deleteProjects } from '@/app/api/projects/route';
import { GET as getViolations } from '@/app/api/violations/route';
import { GET as getScans } from '@/app/api/scans/route';
import { GET as getStatsTrends } from '@/app/api/stats/trends/route';
import { GET as getSchedule } from '@/app/api/schedule/route';
import { GET as getSettings } from '@/app/api/settings/route';
import { GET as getMembers } from '@/app/api/team/members/route';

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as RequestInit & { signal?: AbortSignal });
}

describe('Tenant isolation (IDOR prevention)', () => {
  let orgAId: string;
  let orgBId: string;
  let projectBId: string;
  let scanBId: string;

  beforeAll(async () => {
    const orgA = await db.organization.upsert({
      where: { slug: 'tenant-a' },
      create: { slug: 'tenant-a', name: 'Tenant A', plan: 'agency' },
      update: {},
    });
    const orgB = await db.organization.upsert({
      where: { slug: 'tenant-b' },
      create: { slug: 'tenant-b', name: 'Tenant B', plan: 'agency' },
      update: {},
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const projectB = await db.project.upsert({
      where: { id: `project-b-${orgB.id.slice(0, 8)}` },
      create: {
        id: `project-b-${orgB.id.slice(0, 8)}`,
        name: 'Tenant B Project',
        url: 'https://tenant-b.example.com',
        orgId: orgB.id,
      },
      update: {},
    });
    projectBId = projectB.id;

    const scanB = await db.scan.create({
      data: { projectId: projectB.id, status: 'completed' },
    });
    scanBId = scanB.id;
  });

  afterAll(async () => {
    await db.scan.deleteMany({ where: { projectId: projectBId } });
    await db.project.deleteMany({ where: { id: projectBId } });
    await db.organization.deleteMany({ where: { slug: { in: ['tenant-a', 'tenant-b'] } } });
  });

  it('rejects unauthenticated requests to org-scoped endpoints', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const res = await getProjects(createRequest('/api/projects?orgId=tenant-a'));
    expect(res.status).toBe(401);
  });

  it('blocks reading another tenant via orgId/slug param (projects)', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getProjects(createRequest(`/api/projects?orgId=${orgBId}`));
    expect(res.status).toBe(403);
  });

  it('blocks reading another tenant via slug', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getProjects(createRequest('/api/projects?orgId=tenant-b'));
    expect(res.status).toBe(403);
  });

  it('blocks creating projects in another tenant', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await postProjects(createRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Evil', url: 'https://evil.com', orgSlug: 'tenant-b' }),
    }));
    expect(res.status).toBe(403);
  });

  it('blocks deleting projects in another tenant', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await deleteProjects(createRequest(`/api/projects?id=${projectBId}`));
    expect(res.status).toBe(403);
  });

  it('blocks reading violations of another tenant project', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getViolations(createRequest(`/api/violations?projectId=${projectBId}`));
    expect(res.status).toBe(403);
  });

  it('blocks reading scans of another tenant project', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getScans(createRequest(`/api/scans?projectId=${projectBId}`));
    expect(res.status).toBe(403);
  });

  it('blocks stats trends for another tenant project', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getStatsTrends(createRequest(`/api/stats/trends?projectId=${projectBId}`));
    expect(res.status).toBe(403);
  });

  it('blocks schedule listing scoped to own org only', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getSchedule(createRequest(`/api/schedule?orgId=${orgBId}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((p: { id: string }) => p.id !== projectBId)).toBe(true);
  });

  it('blocks settings of another tenant', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getSettings(createRequest(`/api/settings?orgId=${orgBId}`));
    expect(res.status).toBe(403);
  });

  it('blocks team members listing of another tenant', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getMembers(createRequest('/api/team/members?orgSlug=tenant-b'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when a project does not exist (no info leak)', async () => {
    mockedGetServerSession.mockResolvedValue({
      user: { id: 'u-a', role: 'admin', orgId: orgAId, orgSlug: 'tenant-a' },
    } as never);

    const res = await getViolations(createRequest('/api/violations?projectId=nonexistent-project-id'));
    expect(res.status).toBe(404);
  });
});
