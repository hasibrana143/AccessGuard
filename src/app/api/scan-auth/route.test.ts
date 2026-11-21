import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { GET as GET_ONE, PUT, DELETE } from './[id]/route';
import { db } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth';
const mockedGetServerSession = vi.mocked(getServerSession);

function createRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as RequestInit & { signal?: AbortSignal });
}

function jsonRequest(url: string, method: string, body: unknown): NextRequest {
  return createRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const ORG_SLUG = 'scan-auth-test-org';
const OTHER_ORG_SLUG = 'scan-auth-other-org';

describe('/api/scan-auth (credential API)', () => {
  let orgId: string;
  let otherOrgId: string;
  let adminUserId: string;
  let memberUserId: string;
  let projectId: string;
  let otherOrgProjectId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: ORG_SLUG },
      create: { slug: ORG_SLUG, name: 'Scan Auth Test Org', plan: 'agency' },
      update: {},
    });
    orgId = org.id;

    const otherOrg = await db.organization.upsert({
      where: { slug: OTHER_ORG_SLUG },
      create: { slug: OTHER_ORG_SLUG, name: 'Scan Auth Other Org', plan: 'agency' },
      update: {},
    });
    otherOrgId = otherOrg.id;

    const admin = await db.user.upsert({
      where: { email: 'scan-auth-admin@accessguard.dev' },
      create: {
        email: 'scan-auth-admin@accessguard.dev',
        name: 'Scan Auth Admin',
        password: 'not-used',
        role: 'admin',
        orgId,
        emailVerifiedAt: new Date(),
      },
      update: { emailVerifiedAt: new Date(), role: 'admin', orgId },
    });
    adminUserId = admin.id;

    const member = await db.user.upsert({
      where: { email: 'scan-auth-member@accessguard.dev' },
      create: {
        email: 'scan-auth-member@accessguard.dev',
        name: 'Scan Auth Member',
        password: 'not-used',
        role: 'member',
        orgId,
        emailVerifiedAt: new Date(),
      },
      update: { emailVerifiedAt: new Date(), role: 'member', orgId },
    });
    memberUserId = member.id;

    const project = await db.project.create({
      data: { orgId, name: 'Scan Auth Project', url: 'https://example.com' },
    });
    projectId = project.id;

    const otherProject = await db.project.create({
      data: { orgId: otherOrgId, name: 'Other Org Project', url: 'https://other.example.com' },
    });
    otherOrgProjectId = otherProject.id;
  });

  afterAll(async () => {
    await db.scanAuthConfig.deleteMany({ where: { projectId: { in: [projectId, otherOrgProjectId] } } });
    await db.project.deleteMany({ where: { id: { in: [projectId, otherOrgProjectId] } } });
    await db.user.deleteMany({ where: { email: { in: ['scan-auth-admin@accessguard.dev', 'scan-auth-member@accessguard.dev'] } } });
    await db.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
  });

  function loginAs(userId: string, role: string) {
    mockedGetServerSession.mockResolvedValue({
      user: { id: userId, email: `${userId}@accessguard.dev`, role, orgId },
    } as never);
  }

  it('GET returns 401 without a session', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const response = await GET(createRequest(`/api/scan-auth?projectId=${projectId}`));
    expect(response.status).toBe(401);
  });

  it('GET returns 403 for members (credential management is admin-level)', async () => {
    loginAs(memberUserId, 'member');
    const response = await GET(createRequest(`/api/scan-auth?projectId=${projectId}`));
    expect(response.status).toBe(403);
  });

  it('GET returns 404 for a project outside the caller org', async () => {
    loginAs(adminUserId, 'admin');
    const response = await GET(createRequest(`/api/scan-auth?projectId=${otherOrgProjectId}`));
    expect(response.status).toBe(404);
  });

  it('POST stores secrets encrypted and never returns them', async () => {
    loginAs(adminUserId, 'admin');

    const response = await POST(
      jsonRequest('/api/scan-auth', 'POST', {
        name: 'Staging login',
        type: 'script',
        projectId,
        config: {
          cookies: [{ name: 'session', value: 'super-secret-cookie' }],
          headers: { Authorization: 'Bearer super-secret-token', 'X-Trace': 'keep-me' },
          script: 'document.cookie = "a=b";',
          scriptConfig: {
            loginUrl: 'https://example.com/login',
            usernameSelector: '#email',
            passwordSelector: '#password',
            submitSelector: '#submit',
            username: 'admin@example.com',
            password: 'super-secret-password',
          },
        },
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ success: true });
    expect(JSON.stringify(body)).not.toContain('super-secret-cookie');
    expect(JSON.stringify(body)).not.toContain('super-secret-token');
    expect(JSON.stringify(body)).not.toContain('super-secret-password');
    expect(JSON.stringify(body)).not.toContain('document.cookie');

    // At rest: every secret is encrypted, non-secret values stay readable.
    const stored = await db.scanAuthConfig.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } });
    expect(stored).toBeTruthy();
    const raw = stored!.config;
    expect(raw).not.toContain('super-secret-cookie');
    expect(raw).not.toContain('super-secret-token');
    expect(raw).not.toContain('super-secret-password');
    expect(raw).not.toContain('document.cookie');
    expect(raw).toContain('keep-me');

    const parsed = JSON.parse(raw);
    expect(decryptSecret(parsed.cookies[0].value)).toBe('super-secret-cookie');
    expect(decryptSecret(parsed.headers.Authorization)).toBe('Bearer super-secret-token');
    expect(decryptSecret(parsed.script)).toBe('document.cookie = "a=b";');
    expect(decryptSecret(parsed.scriptConfig.username)).toBe('admin@example.com');
    expect(decryptSecret(parsed.scriptConfig.password)).toBe('super-secret-password');

    // Reads mask the secrets and omit the script and credentials.
    const listResponse = await GET(createRequest(`/api/scan-auth?projectId=${projectId}`));
    expect(listResponse.status).toBe(200);
    const list = await listResponse.json();
    const listed = list.authConfigs.find((c: { id: string }) => c.id === stored!.id);
    expect(listed.config.cookies[0].value).toBe('••••••••');
    expect(listed.config.headers.Authorization).toBe('••••••••');
    expect(listed.config.headers['X-Trace']).toBe('keep-me');
    expect(listed.config.script).toBeUndefined();
    expect(listed.config.scriptConfig.username).toBeUndefined();
    expect(listed.config.scriptConfig.password).toBeUndefined();
    expect(listed.config.scriptConfig.usernameSelector).toBe('#email');

    // Single-resource read behaves the same.
    const oneResponse = await GET_ONE(createRequest(`/api/scan-auth/${stored!.id}`), {
      params: Promise.resolve({ id: stored!.id }),
    });
    expect(oneResponse.status).toBe(200);
    const one = await oneResponse.json();
    expect(one.authConfig.config.cookies[0].value).toBe('••••••••');
    expect(one.authConfig.config.script).toBeUndefined();

    // Update re-encrypts, delete removes the row.
    const putResponse = await PUT(
      jsonRequest(`/api/scan-auth/${stored!.id}`, 'PUT', {
        config: { cookies: [{ name: 'session', value: 'rotated-secret' }] },
      }),
      { params: Promise.resolve({ id: stored!.id }) }
    );
    expect(putResponse.status).toBe(200);
    const afterUpdate = await db.scanAuthConfig.findUnique({ where: { id: stored!.id } });
    expect(afterUpdate!.config).not.toContain('rotated-secret');
    expect(JSON.parse(afterUpdate!.config).cookies[0].value).not.toBe('rotated-secret');

    const deleteResponse = await DELETE(createRequest(`/api/scan-auth/${stored!.id}`), {
      params: Promise.resolve({ id: stored!.id }),
    });
    expect(deleteResponse.status).toBe(200);
    expect(await db.scanAuthConfig.findUnique({ where: { id: stored!.id } })).toBeNull();
  });

  it('POST rejects a missing projectId and a project from another org', async () => {
    loginAs(adminUserId, 'admin');

    const missingProject = await POST(
      jsonRequest('/api/scan-auth', 'POST', { name: 'No project', type: 'cookie' })
    );
    expect(missingProject.status).toBe(400);

    const foreignProject = await POST(
      jsonRequest('/api/scan-auth', 'POST', {
        name: 'Foreign project',
        type: 'cookie',
        projectId: otherOrgProjectId,
      })
    );
    expect(foreignProject.status).toBe(404);
  });

  it('GET on a config from another org returns 404', async () => {
    loginAs(adminUserId, 'admin');
    const foreign = await db.scanAuthConfig.create({
      data: {
        projectId: otherOrgProjectId,
        name: 'Foreign config',
        type: 'cookie',
        config: JSON.stringify({ cookies: [{ name: 'a', value: 'b' }] }),
      },
    });

    const response = await GET_ONE(createRequest(`/api/scan-auth/${foreign.id}`), {
      params: Promise.resolve({ id: foreign.id }),
    });
    expect(response.status).toBe(404);
  });
});
