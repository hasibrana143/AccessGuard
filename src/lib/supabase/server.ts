import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Check if Supabase is configured
const isSupabaseConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function createClient() {
  if (!isSupabaseConfigured) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function getServerSession() {
  const supabase = await createClient()
  
  if (!supabase) {
    return null
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return null
    }
    
    return user
  } catch {
    return null
  }
}

export async function requireAuth() {
  const user = await getServerSession()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export function isConfigured() {
  return isSupabaseConfigured
}
