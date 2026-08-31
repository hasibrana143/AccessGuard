import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { checkUsageQuota, quotaExceededResponse } from './quota';
import { planRateLimit } from './rate-limit';

export interface AuthContext {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  orgId: string;
}

export async function authenticate(req: NextRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      orgId: true,
    },
  });

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
  };
}

export async function verifyOrgAccess(
  auth: AuthContext,
  orgId: string
): Promise<boolean> {
  return auth.orgId === orgId;
}

export async function requirePermission(
  auth: AuthContext,
  permission: string
): Promise<boolean> {
  const role = await prisma.customRole.findFirst({
    where: {
      orgId: auth.orgId,
      name: auth.role,
    },
  });

  if (!role) return false;
  const permissions = JSON.parse(role.permissions || '[]') as string[];
  return permissions.includes(permission) || permissions.includes('*');
}

export async function apiMiddleware(
  req: NextRequest,
  options: {
    requireAuth?: boolean;
    requireQuota?: boolean;
    requiredPermission?: string;
    orgIdParam?: string;
  } = {}
): Promise<{ auth?: AuthContext; error?: NextResponse }> {
  const { requireAuth = true, requireQuota = false, requiredPermission, orgIdParam } = options;

  if (requireAuth) {
    const auth = await authenticate(req);
    if (!auth) {
      return {
        error: NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Valid authentication required' },
          { status: 401 }
        ),
      };
    }

    if (orgIdParam) {
      const orgId = req.nextUrl.searchParams.get(orgIdParam) || req.headers.get('x-org-id');
      if (orgId && !await verifyOrgAccess(auth, orgId)) {
        return {
          error: NextResponse.json(
            { error: 'FORBIDDEN', message: 'Access denied to this organization' },
            { status: 403 }
          ),
        };
      }
    }

    if (requiredPermission) {
      if (!await requirePermission(auth, requiredPermission)) {
        return {
          error: NextResponse.json(
            { error: 'FORBIDDEN', message: `Permission '${requiredPermission}' required` },
            { status: 403 }
          ),
        };
      }
    }

    if (requireQuota) {
      const quota = await checkUsageQuota(auth.orgId);
      if (!quota.allowed) {
        return { error: quotaExceededResponse(quota) };
      }
    }

    const rateLimitResponse = await planRateLimit()(req);
    if (rateLimitResponse) {
      return { error: rateLimitResponse };
    }

    return { auth };
  }

  return {};
}
