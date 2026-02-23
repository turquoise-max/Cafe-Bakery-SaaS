import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. If no user, redirect to login for protected routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/error') &&
    request.nextUrl.pathname !== '/' // Allow landing page if it exists, or remove if root is dashboard
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. If user is logged in
  if (user) {
    // 2a. Redirect away from login/signup pages
    if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname === '/auth/signup') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // 2b. Check onboarding status (exclude onboarding pages, auth callbacks, and static assets)
    if (
      !request.nextUrl.pathname.startsWith('/onboarding') &&
      !request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/_next') &&
      !request.nextUrl.pathname.startsWith('/api') // Exclude API routes to prevent blocking
    ) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      // If no roles found, user needs to onboard
      if (!roles || roles.length === 0) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    }
    
    // 2c. If user is on onboarding but HAS roles, redirect to dashboard
    if (request.nextUrl.pathname.startsWith('/onboarding')) {
       const { data: roles } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (roles && roles.length > 0) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}