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

type SessionUser = { id: string; email: string; role: string; orgId: string };

// requireAuth re-reads the user from the database instead of trusting the
// session payload, so the mock row must carry the full user fields (role,
// orgId…). Returning only { emailVerifiedAt } made every guarded call see an
// undefined role/org and fail closed with 401/403.
function userRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'u-admin',
    email: 'admin@x.com',
    role: 'admin',
    orgId: 'org-1',
    organization: { slug: 'org-1' },
    customRole: null,
    emailVerifiedAt: new Date(),
    ...overrides,
  };
}

async function currentSessionUser(): Promise<SessionUser | undefined> {
  const impl = mockedGetServerSession.getMockImplementation();
  if (!impl) return undefined;
  const result = (await impl()) as { user?: SessionUser } | null;
  return result?.user;
}

// Prisma's findUnique resolves to a thenable client type, so a plain async
// implementation does not satisfy the mocked signature. Cast it once here
// instead of repeating the cast at every call site.
function mockUser(impl: () => Promise<Record<string, unknown>>): void {
  mockedFindUnique.mockImplementation(impl as never);
}

// Default row mirrors the active session (requireAuth re-reads the user).
function mockSessionUser(): void {
  mockUser(async () => {
    const su = await currentSessionUser();
    return userRow(su ? { id: su.id, email: su.email, role: su.role, orgId: su.orgId } : {}) as never;
  });
}

// Row with fixed fields (e.g. an unverified email).
function mockUserRow(overrides: Record<string, unknown>): void {
  mockUser(async () => userRow(overrides) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Mirror the active session into the DB row, like the real database does.
  mockSessionUser();
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
    mockedFindUnique.mockResolvedValue(
      userRow({ id: 'u-api', email: 'api@x.com', role: 'admin', orgId: 'org-1' }) as never,
    );

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
    mockUserRow({ emailVerifiedAt: null });

    const result = await requireRole(createRequest('POST'));
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ error: 'Email verification required. Check your inbox and verify your email first.' });
  });

  it('allows writes when the email is verified', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockUserRow({ emailVerifiedAt: new Date('2026-01-01') });

    const result = await requireRole(createRequest('POST'));
    expect(result instanceof NextResponse).toBe(false);
  });

  it('does not enforce verification on read requests', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockUserRow({ emailVerifiedAt: null });

    const result = await requireRole(createRequest('GET'));
    expect(result instanceof NextResponse).toBe(false);
  });

  it('enforces verification on org-scoped writes', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockUserRow({ emailVerifiedAt: null });
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

    mockUserRow({ emailVerifiedAt: null });
    const rejected = await requireVerifiedEmail(createRequest());
    expect(rejected instanceof NextResponse).toBe(true);
    if (!(rejected instanceof NextResponse)) return;
    expect(rejected.status).toBe(403);

    mockUserRow({ emailVerifiedAt: new Date() });
    const accepted = await requireVerifiedEmail(createRequest());
    expect(accepted instanceof NextResponse).toBe(false);
  });
});

describe('requireProjectAccess (project IDOR guard)', () => {
  beforeEach(() => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockUserRow({ emailVerifiedAt: new Date() });
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
    mockUserRow({ emailVerifiedAt: null });
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
    // MANAGE_BILLING is the one permission the admin tier does not hold
    // (see ADMIN_PERMISSIONS in src/lib/permissions.ts). Any other permission
    // is granted to admins, so asserting on one of those would not exercise
    // the permission guard at all.
    const result = await requireProjectAccess(createRequest('POST'), 'proj-1', {
      permission: PERMISSIONS.MANAGE_BILLING,
    });
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
  });
});
