'use client';

import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface UseAuthReturn {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    orgId: string;
    orgSlug: string | null;
    orgName: string | null;
    emailVerified: boolean;
  } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  sessionValidated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (!result) {
      return { success: false, error: 'No response from authentication server' };
    }

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  }, [router]);

  const user = useMemo(() => {
    const u = session?.user;
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      orgId: u.orgId,
      orgSlug: u.orgSlug,
      orgName: u.orgName,
      emailVerified: u.emailVerified,
    };
  }, [session?.user]);

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isAdmin: user?.role === 'ADMIN',
    sessionValidated: status !== 'loading',
    login,
    logout,
  };
}
