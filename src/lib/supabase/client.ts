import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Check if Supabase is configured
const isSupabaseConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export function createClient() {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.')
    return null
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton pattern for client-side Supabase client
let client: ReturnType<typeof createBrowserClient<Database>> | null | undefined

export function getSupabaseClient() {
  if (client === undefined) {
    client = createClient()
  }
  return client
}

export function isConfigured() {
  return isSupabaseConfigured
}
