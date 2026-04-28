'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { getSupabaseClient, isConfigured } from '@/lib/supabase/client'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type SupabaseContextType = {
  supabase: SupabaseClient<Database> | null
  user: User | null
  isLoading: boolean
  isConfigured: boolean
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  
  const configured = isConfigured()
  const supabase = useMemo(() => getSupabaseClient(), [])

  useEffect(() => {
    // If Supabase is not configured, mark as loaded immediately
    if (!configured || !supabase) {
      return
    }

    let mounted = true

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) {
        setUser(user)
        setAuthLoaded(true)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [configured, supabase]) // Fixed: use supabase instead of supabase.auth

  // Loading is false when either:
  // 1. Supabase is not configured
  // 2. Auth has been loaded
  const isLoading = configured && supabase ? !authLoaded : false

  return (
    <SupabaseContext.Provider value={{ supabase, user, isLoading, isConfigured: configured }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  
  return context
}
