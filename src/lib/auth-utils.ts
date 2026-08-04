import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
