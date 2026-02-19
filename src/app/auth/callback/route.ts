import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user has a store
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('store_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (roles?.store_id) {
           return NextResponse.redirect(`${origin}/dashboard`)
        } else {
           return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}