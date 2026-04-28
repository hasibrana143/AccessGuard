import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  orgId: string | null;
  orgSlug: string | null;
  orgName: string | null;
}

// Get the current authenticated user on the server side
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    orgId: session.user.orgId,
    orgSlug: session.user.orgSlug,
    orgName: session.user.orgName,
  };
}

// Check if user is authenticated (for API routes)
export async function requireAuth(request: NextRequest): Promise<{ user: AuthUser } | NextResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  return { user };
}

// Check if user has required role
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ user: AuthUser } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult.user;

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return { user };
}

// Check if user belongs to the organization
export async function requireOrgAccess(
  request: NextRequest,
  orgSlug: string
): Promise<{ user: AuthUser } | NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult.user;

  // Admin can access any org
  if (user.role === 'admin' && user.orgSlug !== orgSlug) {
    // Check if it's a super admin scenario
    const org = await db.organization.findFirst({
      where: { slug: orgSlug },
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }
  }

  // Regular user can only access their own org
  if (user.orgSlug !== orgSlug && user.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Access denied' },
      { status: 403 }
    );
  }

  return { user };
}
