import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 사용자의 역할 정보 확인 (온보딩 여부 체크)
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!userRole) {
    // 역할 정보가 없으면 온보딩이 필요함
    redirect('/onboarding')
  }

  // 온보딩이 완료된 경우 대시보드로 이동
  redirect('/dashboard')
}