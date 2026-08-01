import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/rbac';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: { user: { findUnique: vi.fn() } },
}));

import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedFindUnique = vi.mocked(db.user.findUnique);

function createRequest(): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/test'), {
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
