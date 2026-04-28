import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

// Check if Supabase is configured
const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co'

export async function updateSession(request: NextRequest) {
  // If Supabase is not configured, just continue without auth check
  if (!isSupabaseConfigured) {
    return NextResponse.next({
      request,
    })
  }

  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Update response cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - only check if user is authenticated
  // Don't redirect, let the client-side handle auth state
  const protectedPaths = ['/dashboard', '/scans', '/violations', '/reports', '/settings']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    // Redirect to home page with a hint to sign in
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('signin', 'true')
    return NextResponse.redirect(url)
  }

  return response
}
