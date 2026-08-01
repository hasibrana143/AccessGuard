import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, verifyToken, extractTokenFromHeader } from '@/lib/auth';
import { db } from '@/lib/db';

export type AuthedUser = {
  id: string;
  email: string;
  role: string;
  orgId: string;
  orgSlug?: string | null;
};

const UNAUTHORIZED = NextResponse.json(
  { success: false, error: 'Authentication required' },
  { status: 401 }
);

const FORBIDDEN = NextResponse.json(
  { success: false, error: 'Insufficient permissions' },
  { status: 403 }
);

const VERIFICATION_REQUIRED = NextResponse.json(
  { success: false, error: 'Email verification required. Check your inbox and verify your email first.' },
  { status: 403 }
);

const WRITE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

// Mutating endpoints require a verified email. Read endpoints stay open so
// the verification banner can guide users toward confirming their inbox.
export async function requireVerifiedEmail(
  request: NextRequest
): Promise<{ user: AuthedUser } | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const user = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { emailVerifiedAt: true },
  });
  if (!user || !user.emailVerifiedAt) return VERIFICATION_REQUIRED;
  return auth;
}

async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { emailVerifiedAt: true },
  });
  return Boolean(user?.emailVerifiedAt);
}

// Shared guard: verify the email when the request mutates state.
async function enforceVerificationOnWrite(
  request: NextRequest,
  userId: string
): Promise<true | NextResponse> {
  if (!WRITE_METHODS.includes(request.method)) return true;
  if (!(await isEmailVerified(userId))) return VERIFICATION_REQUIRED;
  return true;
}

export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthedUser } | NextResponse> {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const su = session.user as unknown as AuthedUser;
    if (su.id && su.role) {
      return { user: { id: su.id, email: su.email ?? '', role: su.role, orgId: su.orgId, orgSlug: su.orgSlug } };
    }
  }

  const token = extractTokenFromHeader(request.headers.get('Authorization'));
  if (!token) return UNAUTHORIZED;
  const payload = verifyToken(token);
  if (!payload) return UNAUTHORIZED;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true, orgId: true },
  });
  if (!user) return UNAUTHORIZED;

  return { user: { id: user.id, email: user.email, role: user.role, orgId: user.orgId } };
}

export async function requireRole(
  request: NextRequest,
  allowed: string[] = ['admin', 'owner']
): Promise<{ user: AuthedUser } | NextResponse> {
  const result = await requireAuth(request);
  if (result instanceof NextResponse) return result;
  if (!allowed.includes(result.user.role)) return FORBIDDEN;
  const verified = await enforceVerificationOnWrite(request, result.user.id);
  if (verified instanceof NextResponse) return verified;
  return result;
}

// Resolve an org identifier (uuid or slug) and verify the authenticated user
// is a member. Prevents cross-tenant access via client-supplied org IDs.
export async function requireOrgAccess(
  request: NextRequest,
  orgParam: string | null | undefined
): Promise<{ user: AuthedUser; org: { id: string; slug: string; name: string | null; plan: string | null; settings: string | null } } | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const org = await db.organization.findFirst({
    where: orgParam
      ? { OR: [{ id: orgParam }, { slug: orgParam }] }
      : { id: auth.user.orgId },
    select: { id: true, slug: true, name: true, plan: true, settings: true },
  });

  if (!org) {
    return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
  }
  if (org.id !== auth.user.orgId) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  const verified = await enforceVerificationOnWrite(request, auth.user.id);
  if (verified instanceof NextResponse) return verified;
  return { user: auth.user, org };
}

// Verify a project belongs to the authenticated user's org before any access.
export async function requireProjectAccess(
  request: NextRequest,
  projectId: string | null | undefined
): Promise<{ user: AuthedUser; project: { id: string; orgId: string } } | NextResponse> {
  if (!projectId) {
    return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 });
  }
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const project = await db.project.findFirst({
    where: { id: projectId, isActive: true },
    select: { id: true, orgId: true },
  });
  if (!project) {
    return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
  }
  if (project.orgId !== auth.user.orgId) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  const verified = await enforceVerificationOnWrite(request, auth.user.id);
  if (verified instanceof NextResponse) return verified;
  return { user: auth.user, project };
}

// Verify a scan belongs to a project in the authenticated user's org.
export async function requireScanAccess(
  request: NextRequest,
  scanId: string | null | undefined
): Promise<{ user: AuthedUser; scan: { id: string; projectId: string } } | NextResponse> {
  if (!scanId) {
    return NextResponse.json({ success: false, error: 'Scan ID is required' }, { status: 400 });
  }
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const scan = await db.scan.findFirst({
    where: { id: scanId, project: { orgId: auth.user.orgId } },
    select: { id: true, projectId: true },
  });
  if (!scan) {
    return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 });
  }
  const verified = await enforceVerificationOnWrite(request, auth.user.id);
  if (verified instanceof NextResponse) return verified;
  return { user: auth.user, scan };
}
