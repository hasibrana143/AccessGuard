import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, requireOrgAccess, requireVerifiedEmail, requireProjectAccess } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    organization: { findFirst: vi.fn() },
    project: { findFirst: vi.fn() },
  },
}));

import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedFindUnique = vi.mocked(db.user.findUnique);
const mockedOrgFindFirst = vi.mocked(db.organization.findFirst);
const mockedProjectFindFirst = vi.mocked(db.project.findFirst);

function createRequest(method = 'GET'): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/test'), {
    method,
    headers: { 'Content-Type': 'application/json' },
  });
}

const adminSession = {
  user: { id: 'u-admin', email: 'admin@x.com', role: 'admin', orgId: 'org-1' },
};
const memberSession = {
  user: { id: 'u-member', email: 'member@x.com', role: 'member', orgId: 'org-1' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedFindUnique.mockResolvedValue({ emailVerifiedAt: new Date() } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requireAuth (contract)', () => {
  it('accepts an authenticated session', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    const result = await requireAuth(createRequest());
    expect(result instanceof NextResponse).toBe(false);
    if (result instanceof NextResponse) return;
    expect(result.user.role).toBe('admin');
    expect(result.user.orgId).toBe('org-1');
  });

  it('rejects when no session and no Bearer token', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const result = await requireAuth(createRequest());
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(401);
    expect(await result.json()).toMatchObject({ success: false });
  });

  it('accepts a valid Bearer API token with an existing user', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    mockedFindUnique.mockResolvedValue({
      id: 'u-api', email: 'api@x.com', role: 'admin', orgId: 'org-1',
    } as never);

    const request = createRequest();
    // Sign a real JWT with the app secret so verifyToken accepts it
    const { signToken } = await import('@/lib/auth');
    const token = signToken({ userId: 'u-api', email: 'api@x.com', orgId: 'org-1' });
    request.headers.set('Authorization', `Bearer ${token}`);

    const result = await requireAuth(request);
    expect(result instanceof NextResponse).toBe(false);
    if (result instanceof NextResponse) return;
    expect(result.user.id).toBe('u-api');
    expect(mockedFindUnique).toHaveBeenCalled();
  });

  it('rejects an invalid Bearer token', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const request = createRequest();
    request.headers.set('Authorization', 'Bearer not-a-real-token');
    const result = await requireAuth(request);
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(401);
  });
});

describe('requireRole (contract)', () => {
  it('allows admin through', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    const result = await requireRole(createRequest());
    expect(result instanceof NextResponse).toBe(false);
  });

  it('blocks member from admin routes with 403', async () => {
    mockedGetServerSession.mockResolvedValue(memberSession as never);
    const result = await requireRole(createRequest());
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ error: 'Insufficient permissions' });
  });

  it('allows member through when member is in the allowed list', async () => {
    mockedGetServerSession.mockResolvedValue(memberSession as never);
    const result = await requireRole(createRequest(), ['admin', 'owner', 'member']);
    expect(result instanceof NextResponse).toBe(false);
  });

  it('blocks unauthenticated with 401', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const result = await requireRole(createRequest());
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(401);
  });
});

describe('email verification enforcement', () => {
  it('blocks write requests with 403 when the email is unverified', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: null } as never);

    const result = await requireRole(createRequest('POST'));
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ error: 'Email verification required. Check your inbox and verify your email first.' });
  });

  it('allows writes when the email is verified', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: new Date('2026-01-01') } as never);

    const result = await requireRole(createRequest('POST'));
    expect(result instanceof NextResponse).toBe(false);
  });

  it('does not enforce verification on read requests', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: null } as never);

    const result = await requireRole(createRequest('GET'));
    expect(result instanceof NextResponse).toBe(false);
  });

  it('enforces verification on org-scoped writes', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: null } as never);
    mockedOrgFindFirst.mockResolvedValue({
      id: 'org-1', slug: 'org-1', name: 'Org', plan: 'agency', settings: null,
    } as never);

    const result = await requireOrgAccess(createRequest('POST'), 'org-1');
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
  });

  it('requireVerifiedEmail rejects unverified users and accepts verified ones', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);

    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: null } as never);
    const rejected = await requireVerifiedEmail(createRequest());
    expect(rejected instanceof NextResponse).toBe(true);
    if (!(rejected instanceof NextResponse)) return;
    expect(rejected.status).toBe(403);

    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: new Date() } as never);
    const accepted = await requireVerifiedEmail(createRequest());
    expect(accepted instanceof NextResponse).toBe(false);
  });
});

describe('requireProjectAccess (project IDOR guard)', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: new Date() } as never);
    mockedProjectFindFirst.mockResolvedValue({ id: 'proj-1', orgId: 'org-1' } as never);
  });

  it('rejects a missing project id with 400', async () => {
    const result = await requireProjectAccess(createRequest(), null);
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(400);
  });

  it('rejects unauthenticated access with 401', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const result = await requireProjectAccess(createRequest(), 'proj-1');
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(401);
  });

  it('rejects a non-existent or inactive project with 404', async () => {
    mockedProjectFindFirst.mockResolvedValue(null as never);
    const result = await requireProjectAccess(createRequest(), 'ghost');
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(404);
    expect(mockedProjectFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ghost', isActive: true } })
    );
  });

  it('rejects cross-org project access with 403 (IDOR)', async () => {
    mockedProjectFindFirst.mockResolvedValue({ id: 'proj-other', orgId: 'org-other' } as never);
    const result = await requireProjectAccess(createRequest(), 'proj-other');
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ error: 'Insufficient permissions' });
  });

  it('rejects write access for unverified users with 403', async () => {
    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: null } as never);
    const result = await requireProjectAccess(createRequest('POST'), 'proj-1');
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
  });

  it('allows verified org access to the project', async () => {
    const result = await requireProjectAccess(createRequest(), 'proj-1');
    expect(result instanceof NextResponse).toBe(false);
    if (result instanceof NextResponse) return;
    expect(result.project).toEqual({ id: 'proj-1', orgId: 'org-1' });
  });

  it('rejects access when the required permission is missing', async () => {
    const result = await requireProjectAccess(createRequest('POST'), 'proj-1', {
      permission: PERMISSIONS.CREATE_PROJECTS,
    });
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
  });
});
