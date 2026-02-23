'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type SignupState = {
  error?: string
  success: boolean
  message?: string
  redirect?: string
}

export async function signup(prevState: SignupState, formData: FormData): Promise<SignupState> {
  // 1. Basic Validation
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  if (!email || !password || !name) {
    return { error: '모든 필드를 입력해주세요.', success: false, message: '', redirect: '' }
  }

  try {
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    // 2. Sign Up with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          name: name,
          full_name: name,
        },
      },
    })

    if (error) {
      console.error('Signup Error:', error)
      return { error: error.message, success: false }
    }

    // 3. Check for Email Confirmation Requirement
    if (data.user && !data.session) {
      return { 
        success: true, 
        message: '가입 확인 메일을 보냈습니다. 만약 이미 가입된 이메일이라면 인증 메일이 발송되지 않습니다. 로그인을 시도해 보세요.' 
      }
    }

    // 4. Success (Session created)
    return { success: true, redirect: '/onboarding' }

  } catch (err) {
    console.error('Unexpected Signup Error:', err)
    return { error: '알 수 없는 오류가 발생했습니다.', success: false }
  }
}