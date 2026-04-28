import { createClient, isConfigured } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Check if Supabase is configured
  if (!isConfigured()) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
