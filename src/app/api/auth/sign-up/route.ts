import { createClient, isConfigured } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Check if Supabase is configured
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Please set up your environment variables.' },
      { status: 503 }
    )
  }

  try {
    const { email, password, name, organizationName } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Failed to create Supabase client' },
        { status: 500 }
      )
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (error) {
      // Provide user-friendly error messages
      let errorMessage = error.message
      
      if (error.message.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.'
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.'
      } else if (error.message.includes('weak password')) {
        errorMessage = 'Password is too weak. Please use at least 6 characters.'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // Create user profile in our users table
    // Using the auth user's ID and email
    if (data.user) {
      // Use a direct SQL approach via Supabase RPC or direct insert
      // The RLS policy we created should allow this
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          name: name || email.split('@')[0],
          role: 'USER',
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // Don't fail the registration, just log the error
        // The profile will be created on first login
      }

      // Create organization if organizationName is provided
      if (organizationName) {
        const slug = organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')

        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: organizationName,
            slug: slug || `org-${Date.now()}`,
            plan: 'FREE',
          })
          .select()
          .single()

        if (!orgError && org) {
          // Add user as owner of the organization
          await supabase.from('organization_members').insert({
            organization_id: org.id,
            user_id: data.user.id,
            role: 'OWNER',
          })
        }
      }
    }

    return NextResponse.json({
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      session: data.session,
    })
  } catch (error) {
    console.error('Sign up error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
