import { getCurrentUser } from '@/lib/auth-supabase'
import { isConfigured } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  // Check if Supabase is configured
  if (!isConfigured()) {
    return NextResponse.json({ 
      user: null,
      message: 'Supabase is not configured. Please set up your environment variables.'
    })
  }

  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ user: null })
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}
