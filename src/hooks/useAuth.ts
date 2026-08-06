'use client';

import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

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
    queryClient.clear();
    await signOut({ redirect: false });
    router.push('/');
    router.refresh();
  }, [queryClient, router]);

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

  const prevOrgRef = useRef<string | null>(null);
  useEffect(() => {
    const orgId = user?.orgId ?? null;
    if (prevOrgRef.current !== null && prevOrgRef.current !== orgId) {
      queryClient.clear();
    }
    prevOrgRef.current = orgId;
  }, [user?.orgId, queryClient]);

  return {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isAdmin: user?.role === 'admin' || user?.role === 'owner',
    sessionValidated: status !== 'loading',
    login,
    logout,
  };
}
