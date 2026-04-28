'use client'

import { SupabaseProvider } from '@/components/SupabaseProvider'
import { ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <SupabaseProvider>{children}</SupabaseProvider>
}
