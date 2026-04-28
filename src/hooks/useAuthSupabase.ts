'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient, isConfigured } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthUser {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: 'USER' | 'ADMIN' | 'AUDITOR'
}

interface UseAuthReturn {
  user: AuthUser | null
  authUser: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export function useAuthSupabase(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const configured = isConfigured()

  const fetchUser = useCallback(async () => {
    if (!configured) {
      setIsLoading(false)
      return
    }

    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setIsLoading(false)
        return
      }
      
      const { data: { user: authData } } = await supabase.auth.getUser()
      
      setAuthUser(authData)
      
      if (authData) {
        // Fetch user profile from our API
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
      setAuthUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [configured])

  useEffect(() => {
    fetchUser()

    if (!configured) return

    // Listen for auth state changes
    const supabase = getSupabaseClient()
    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUser()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setAuthUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser, configured])

  const signIn = async (email: string, password: string) => {
    if (!configured) {
      return { error: 'Supabase is not configured. Please set up your environment variables.' }
    }

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Sign in failed' }
      }

      await fetchUser()
      router.push('/dashboard')
      router.refresh()
      
      return { error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    if (!configured) {
      return { error: 'Supabase is not configured. Please set up your environment variables.' }
    }

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.error || 'Sign up failed' }
      }

      // Check if email confirmation is required
      if (!data.session) {
        return { error: 'Please check your email to confirm your account' }
      }

      await fetchUser()
      router.push('/dashboard')
      router.refresh()
      
      return { error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    if (!configured) return

    try {
      await fetch('/api/auth/sign-out', { method: 'POST' })
      
      const supabase = getSupabaseClient()
      if (supabase) {
        await supabase.auth.signOut()
      }
      
      setUser(null)
      setAuthUser(null)
      router.push('/auth/login')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const refreshUser = async () => {
    setIsLoading(true)
    await fetchUser()
  }

  return {
    user,
    authUser,
    isLoading,
    isAuthenticated: !!user,
    isConfigured: configured,
    signIn,
    signUp,
    signOut,
    refreshUser,
  }
}
