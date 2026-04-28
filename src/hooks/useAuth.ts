'use client'

import { useAuthSupabase } from '@/hooks/useAuthSupabase'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export interface UseAuthReturn {
  user: {
    id: string
    email: string
    name: string | null
    role: string
  } | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isConfigured: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const { user, isLoading, isAuthenticated, isConfigured, signIn, signOut } = useAuthSupabase()
  const router = useRouter()

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn(email, password)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true }
  }, [signIn])

  const logout = useCallback(async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }, [signOut, router])

  return {
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
    } : null,
    isLoading,
    isAuthenticated,
    isAdmin: user?.role === 'ADMIN',
    isConfigured,
    login,
    logout,
  }
}
