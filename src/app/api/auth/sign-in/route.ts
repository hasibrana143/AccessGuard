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
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Provide user-friendly error messages
      let errorMessage = error.message
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.'
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment and try again.'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    })
  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
