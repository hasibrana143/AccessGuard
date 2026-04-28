import { createClient, isConfigured } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  // Check if Supabase is configured
  if (!isConfigured()) {
    return NextResponse.json({ success: true })
  }

  try {
    const supabase = await createClient()
    
    if (supabase) {
      await supabase.auth.signOut()
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sign out error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
