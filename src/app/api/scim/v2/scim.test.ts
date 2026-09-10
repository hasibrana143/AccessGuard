import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET as ListGet, POST as UsersPost } from './Users/route';
import { GET as UserGet, PATCH as UserPatch, DELETE as UserDelete } from './Users/[id]/route';
import { POST as GroupsPost } from './Groups/route';
import { PATCH as GroupPatch } from './Groups/[id]/route';
import { GET as ConfigGet } from './ServiceProviderConfig/route';

vi.mock('@/lib/scim', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/scim')>();
  return { ...actual, resolveScimToken: vi.fn() };
});

import { resolveScimToken } from '@/lib/scim';
const mockedResolve = vi.mocked(resolveScimToken);

function scimRequest(url: string, options: RequestInit = {}): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), options as RequestInit & { signal?: AbortSignal });
}

describe('SCIM 2.0 endpoints (contract)', () => {
  let testOrgId: string;
  let provisionedId: string;

  beforeAll(async () => {
    const org = await db.organization.upsert({
      where: { slug: 'scim-test-org' },
      create: { slug: 'scim-test-org', name: 'SCIM Test Org', plan: 'agency' },
      update: {},
    });
    testOrgId = org.id;
  });

  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: testOrgId } });
  });

  it('ServiceProviderConfig rejects missing bearer token', async () => {
    const response = await ConfigGet(scimRequest('/api/scim/v2/ServiceProviderConfig'));
    expect(response.status).toBe(401);
  });

  it('ServiceProviderConfig rejects invalid token', async () => {
    mockedResolve.mockResolvedValue(null);
    const response = await ConfigGet(
      scimRequest('/api/scim/v2/ServiceProviderConfig', {
        headers: { Authorization: 'Bearer ag_scim_bogus' },
      })
    );
    expect(response.status).toBe(401);
  });

  it('ServiceProviderConfig returns discovery document', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await ConfigGet(
      scimRequest('/api/scim/v2/ServiceProviderConfig', {
        headers: { Authorization: 'Bearer ag_scim_valid' },
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig');
    expect(body.patch.supported).toBe(true);
    expect(body.bulk.supported).toBe(false);
  });

  it('POST /Users rejects invalid email', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await UsersPost(
      scimRequest('/api/scim/v2/Users', {
        method: 'POST',
        headers: { Authorization: 'Bearer ag_scim_valid', 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], userName: 'not-an-email' }),
      })
    );
    expect(response.status).toBe(400);
  });

  it('POST /Users provisions a member and returns RFC 7644 resource', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await UsersPost(
      scimRequest('/api/scim/v2/Users', {
        method: 'POST',
        headers: { Authorization: 'Bearer ag_scim_valid', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
          userName: 'scim.provisioned@example.com',
          name: { givenName: 'Scim', familyName: 'Provisioned' },
        }),
      })
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.userName).toBe('scim.provisioned@example.com');
    expect(body.roles).toContain('member');
    expect(body.active).toBe(true);
    expect(body.emails[0].value).toBe('scim.provisioned@example.com');
    provisionedId = body.id;
  });

  it('POST /Users is idempotent for an existing org member', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await UsersPost(
      scimRequest('/api/scim/v2/Users', {
        method: 'POST',
        headers: { Authorization: 'Bearer ag_scim_valid', 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], userName: 'scim.provisioned@example.com' }),
      })
    );
    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe(provisionedId);
  });

  it('GET /Users lists org users with SCIM envelope', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await ListGet(
      scimRequest('/api/scim/v2/Users', {
        headers: { Authorization: 'Bearer ag_scim_valid' },
      })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
    expect(body.totalResults).toBeGreaterThanOrEqual(1);
    expect(body.Resources.some((u: { userName: string }) => u.userName === 'scim.provisioned@example.com')).toBe(true);
  });

  it('GET /Users supports userName eq filter', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await ListGet(
      scimRequest('/api/scim/v2/Users?filter=userName%20eq%20%22scim.provisioned@example.com%22', {
        headers: { Authorization: 'Bearer ag_scim_valid' },
      })
    );
    const body = await response.json();
    expect(body.totalResults).toBe(1);
    expect(body.Resources[0].userName).toBe('scim.provisioned@example.com');
  });

  it('GET /Users/:id returns 404 for foreign users', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await UserGet(
      scimRequest('/api/scim/v2/Users/nonexistent', { headers: { Authorization: 'Bearer ag_scim_valid' } }),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    );
    expect(response.status).toBe(404);
  });

  it('PATCH active=false deprovisions the user (204 + audit)', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await UserPatch(
      scimRequest('/api/scim/v2/Users/x', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ag_scim_valid', 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], active: false }),
      }),
      { params: Promise.resolve({ id: provisionedId }) }
    );
    expect(response.status).toBe(204);

    const audit = await db.auditLog.findFirst({
      where: { orgId: testOrgId, action: 'scim_user_deactivated' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit!.metadata).toContain('scim.provisioned@example.com');

    const gone = await db.user.findFirst({ where: { id: provisionedId } });
    expect(gone).toBeNull();
  });

  it('DELETE /Users/:id is a no-op 404 for missing users', async () => {
    mockedResolve.mockResolvedValue(testOrgId);
    const response = await UserDelete(
      scimRequest('/api/scim/v2/Users/missing', { method: 'DELETE', headers: { Authorization: 'Bearer ag_scim_valid' } }),
      { params: Promise.resolve({ id: 'missing' }) }
    );
    expect(response.status).toBe(404);
  });

  describe('Groups PATCH (RFC 7644 PatchOp)', () => {
    let groupId: string;
    const auth = { Authorization: 'Bearer ag_scim_valid', 'Content-Type': 'application/json' };
    const patchBody = (Operations: unknown) =>
      JSON.stringify({ schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations });

    it('POST /Groups creates the fixture group', async () => {
      mockedResolve.mockResolvedValue(testOrgId);
      const response = await GroupsPost(
        scimRequest('/api/scim/v2/Groups', {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({ displayName: 'Patch Eng', members: [] }),
        })
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      groupId = body.id;
      expect(body.displayName).toBe('Patch Eng');
    });

    it('PATCH replace displayName renames the group', async () => {
      mockedResolve.mockResolvedValue(testOrgId);
      const response = await GroupPatch(
        scimRequest(`/api/scim/v2/Groups/${groupId}`, {
          method: 'PATCH',
          headers: auth,
          body: patchBody([{ op: 'replace', path: 'displayName', value: 'Patch Eng Renamed' }]),
        })
      );
      expect(response.status).toBe(200);
      expect((await response.json()).displayName).toBe('Patch Eng Renamed');
    });

    it('PATCH add members appends without duplicates', async () => {
      mockedResolve.mockResolvedValue(testOrgId);
      const ops = [
        { op: 'add', path: 'members', value: [{ value: 'user-1' }, { value: 'user-2' }] },
        { op: 'add', path: 'members', value: [{ value: 'user-2' }] },
      ];
      const response = await GroupPatch(
        scimRequest(`/api/scim/v2/Groups/${groupId}`, { method: 'PATCH', headers: auth, body: patchBody(ops) })
      );
      expect(response.status).toBe(200);
      const members = (await response.json()).members.map((m: { value: string }) => m.value).sort();
      expect(members).toEqual(['user-1', 'user-2']);
    });

    it('PATCH remove members[value eq] drops one member', async () => {
      mockedResolve.mockResolvedValue(testOrgId);
      const response = await GroupPatch(
        scimRequest(`/api/scim/v2/Groups/${groupId}`, {
          method: 'PATCH',
          headers: auth,
          body: patchBody([{ op: 'remove', path: 'members[value eq "user-1"]' }]),
        })
      );
      expect(response.status).toBe(200);
      const members = (await response.json()).members.map((m: { value: string }) => m.value);
      expect(members).toEqual(['user-2']);
    });

    it('PATCH rejects unknown op and unknown path', async () => {
      mockedResolve.mockResolvedValue(testOrgId);
      const badOp = await GroupPatch(
        scimRequest(`/api/scim/v2/Groups/${groupId}`, {
          method: 'PATCH', headers: auth, body: patchBody([{ op: 'move', path: 'displayName', value: 'X' }]),
        })
      );
      expect(badOp.status).toBe(400);
      const badPath = await GroupPatch(
        scimRequest(`/api/scim/v2/Groups/${groupId}`, {
          method: 'PATCH', headers: auth, body: patchBody([{ op: 'replace', path: 'nope', value: 'X' }]),
        })
      );
      expect(badPath.status).toBe(400);
    });

    it('PATCH rejects missing Operations and missing token', async () => {
      mockedResolve.mockResolvedValue(testOrgId);
      const noOps = await GroupPatch(
        scimRequest(`/api/scim/v2/Groups/${groupId}`, { method: 'PATCH', headers: auth, body: JSON.stringify({}) })
      );
      expect(noOps.status).toBe(400);
      mockedResolve.mockResolvedValue(null);
      const noAuth = await GroupPatch(
        scimRequest(`/api/scim/v2/Groups/${groupId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: patchBody([]),
        })
      );
      expect(noAuth.status).toBe(401);
    });

    it('PATCH duplicate displayName returns 409', async () => {
      mockedResolve.mockResolvedValue(testOrgId);
      await GroupsPost(
        scimRequest('/api/scim/v2/Groups', {
          method: 'POST', headers: auth, body: JSON.stringify({ displayName: 'Patch Taken' }),
        })
      );
      const response = await GroupPatch(
        scimRequest(`/api/scim/v2/Groups/${groupId}`, {
          method: 'PATCH', headers: auth,
          body: patchBody([{ op: 'replace', path: 'displayName', value: 'Patch Taken' }]),
        })
      );
      expect(response.status).toBe(409);
    });
  });
});
