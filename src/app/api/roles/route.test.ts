import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GET, POST, PATCH, DELETE } from './route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { vi } from 'vitest';
import { getServerSession } from 'next-auth';
const mockedGetServerSession = vi.mocked(getServerSession);

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as RequestInit & { signal?: AbortSignal });
}

describe('Roles API', () => {
  let testOrgId: string;
  let adminUserId: string;
  let createdRoleId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'test-org-roles' },
      create: { slug: 'test-org-roles', name: 'Test Organization (Roles)', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;

    const admin = await db.user.upsert({
      where: { email: 'roles-admin@accessguard.dev' },
      create: {
        email: 'roles-admin@accessguard.dev',
        name: 'Roles Admin',
        password: 'not-used',
        role: 'admin',
        orgId: testOrgId,
        emailVerifiedAt: new Date(),
      },
      update: { emailVerifiedAt: new Date() },
    });
    adminUserId = admin.id;

    mockedGetServerSession.mockResolvedValue({
      user: { id: adminUserId, email: 'roles-admin@accessguard.dev', role: 'admin', orgId: testOrgId, orgSlug: 'test-org-roles' },
    } as never);
  });

  afterAll(async () => {
    await db.customRole.deleteMany({ where: { orgId: testOrgId } });
    await db.user.deleteMany({ where: { id: adminUserId } });
    await db.organization.deleteMany({ where: { id: testOrgId } });
  });

  beforeEach(async () => {
    await db.customRole.deleteMany({ where: { orgId: testOrgId } });
  });

  it('creates a role with permissions', async () => {
    const res = await POST(createRequest('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Reviewer', description: 'Reviews scans', permissions: ['view_projects', 'run_scans'] }),
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBeDefined();
    createdRoleId = data.data.id;
  });

  it('rejects duplicate role names with 409', async () => {
    await POST(createRequest('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dupe', permissions: ['run_scans'] }),
    }));
    const res = await POST(createRequest('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dupe', permissions: ['run_scans'] }),
    }));
    expect(res.status).toBe(409);
  });

  it('lists roles scoped to the org', async () => {
    await POST(createRequest('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Auditor', permissions: ['view_projects', 'generate_reports'] }),
    }));
    const res = await GET(createRequest('/api/roles'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.some((r: { name: string }) => r.name === 'Auditor')).toBe(true);
  });

  it('updates a role', async () => {
    const created = await POST(createRequest('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updatable', permissions: ['run_scans'] }),
    }));
    const createdData = await created.json();

    const res = await PATCH(createRequest('/api/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: createdData.data.id, name: 'Renamed', permissions: ['run_scans', 'create_pr'] }),
    }));
    expect(res.status).toBe(200);

    const list = await GET(createRequest('/api/roles'));
    const listData = await list.json();
    const role = listData.data.find((r: { id: string }) => r.id === createdData.data.id);
    expect(role.name).toBe('Renamed');
    expect(role.permissions).toContain('create_pr');
  });

  it('deletes a role', async () => {
    const created = await POST(createRequest('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Temp', permissions: ['run_scans'] }),
    }));
    const createdData = await created.json();

    const res = await DELETE(createRequest(`/api/roles?id=${createdData.data.id}`, { method: 'DELETE' }));
    expect(res.status).toBe(200);

    const list = await GET(createRequest('/api/roles'));
    const listData = await list.json();
    expect(listData.data.some((r: { id: string }) => r.id === createdData.data.id)).toBe(false);
  });
});
