import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { PERMISSIONS, ALL_PERMISSIONS, safeParsePermissions } from '@/lib/permissions';
import { requirePermission } from '@/lib/rbac';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedFindUnique = vi.mocked(db.user.findUnique);

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

const adminRow = { emailVerifiedAt: new Date(), role: 'admin', customRole: null };
const memberRow = { emailVerifiedAt: new Date(), role: 'member', customRole: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockedFindUnique.mockResolvedValue(adminRow as never);
});

describe('permission constants', () => {
  it('defines the full permission catalog', () => {
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.MANAGE_TEAM);
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.MANAGE_BILLING);
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it('parses persisted permission JSON safely', () => {
    expect(safeParsePermissions('["run_scans","manage_team","bogus"]')).toEqual(['run_scans', 'manage_team']);
    expect(safeParsePermissions('not-json')).toEqual([]);
    expect(safeParsePermissions(null)).toEqual([]);
    expect(safeParsePermissions('{}')).toEqual([]);
  });
});

describe('requirePermission', () => {
  it('allows admins any permission', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    const result = await requirePermission(createRequest(), PERMISSIONS.MANAGE_TEAM);
    expect(result instanceof NextResponse).toBe(false);
  });

  it('denies admins manage_billing', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    const result = await requirePermission(createRequest(), PERMISSIONS.MANAGE_BILLING);
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
  });

  it('blocks members from manage_team with 403', async () => {
    mockedGetServerSession.mockResolvedValue(memberSession as never);
    mockedFindUnique.mockResolvedValue(memberRow as never);
    const result = await requirePermission(createRequest(), PERMISSIONS.MANAGE_TEAM);
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ error: 'Insufficient permissions' });
  });

  it('allows members base permissions like run_scans', async () => {
    mockedGetServerSession.mockResolvedValue(memberSession as never);
    mockedFindUnique.mockResolvedValue(memberRow as never);
    const result = await requirePermission(createRequest(), PERMISSIONS.RUN_SCANS);
    expect(result instanceof NextResponse).toBe(false);
  });

  it('grants member the permissions of their custom role', async () => {
    mockedGetServerSession.mockResolvedValue(memberSession as never);
    mockedFindUnique.mockResolvedValue({
      emailVerifiedAt: new Date(),
      role: 'member',
      customRole: { permissions: JSON.stringify(['create_projects', 'manage_github']) },
    } as never);

    const blocked = await requirePermission(createRequest(), PERMISSIONS.MANAGE_BILLING);
    expect(blocked instanceof NextResponse).toBe(true);

    const allowed = await requirePermission(createRequest(), PERMISSIONS.CREATE_PROJECTS);
    expect(allowed instanceof NextResponse).toBe(false);

    const allowed2 = await requirePermission(createRequest(), PERMISSIONS.MANAGE_GITHUB);
    expect(allowed2 instanceof NextResponse).toBe(false);
  });

  it('requires a verified email on writes even with permission', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession as never);
    mockedFindUnique.mockResolvedValue({ emailVerifiedAt: null } as never);
    const result = await requirePermission(createRequest('POST'), PERMISSIONS.RUN_SCANS);
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ error: 'Email verification required. Check your inbox and verify your email first.' });
  });

  it('rejects unauthenticated requests', async () => {
    mockedGetServerSession.mockResolvedValue(null as never);
    const result = await requirePermission(createRequest(), PERMISSIONS.RUN_SCANS);
    expect(result instanceof NextResponse).toBe(true);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(401);
  });
});
