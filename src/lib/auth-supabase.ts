import { createClient, isConfigured } from '@/lib/supabase/server'

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  role: 'USER' | 'ADMIN' | 'AUDITOR'
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // Check if Supabase is configured
  if (!isConfigured()) {
    return null
  }

  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return null
    }

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user profile from our users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // Create profile if it doesn't exist
      const newProfile = {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        role: 'USER',
        avatarUrl: user.user_metadata?.avatar_url,
      }

      const { data: createdProfile, error: createError } = await supabase
        .from('users')
        .insert(newProfile)
        .select()
        .single()

      if (createError) {
        console.error('Error creating user profile:', createError)
        return null
      }

      return {
        id: createdProfile.id,
        email: createdProfile.email,
        name: createdProfile.name || undefined,
        avatarUrl: createdProfile.avatarUrl || undefined,
        role: createdProfile.role as 'USER' | 'ADMIN' | 'AUDITOR',
      }
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name || undefined,
      avatarUrl: profile.avatarUrl || undefined,
      role: profile.role as 'USER' | 'ADMIN' | 'AUDITOR',
    }
  } catch {
    return null
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function requireRole(roles: ('USER' | 'ADMIN' | 'AUDITOR')[]): Promise<AuthUser> {
  const user = await requireAuth()
  
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  
  return user
}

export async function signOut() {
  if (!isConfigured()) return
  
  const supabase = await createClient()
  if (supabase) {
    await supabase.auth.signOut()
  }
}

// Check if user has access to organization
export async function hasOrgAccess(orgId: string): Promise<boolean> {
  const user = await getCurrentUser()
  
  if (!user) return false
  if (user.role === 'ADMIN') return true

  if (!isConfigured()) return false
  
  const supabase = await createClient()
  if (!supabase) return false

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('userId', user.id)
    .eq('organizationId', orgId)
    .single()

  return !!membership
}

// Get user's organizations
export async function getUserOrganizations() {
  const user = await getCurrentUser()
  
  if (!user || !isConfigured()) return []

  const supabase = await createClient()
  if (!supabase) return []
  
  if (user.role === 'ADMIN') {
    // Admin can see all organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
    return orgs || []
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations(*)
    `)
    .eq('userId', user.id)

  return memberships?.map(m => ({
    ...m.organization,
    memberRole: m.role,
  })) || []
}
