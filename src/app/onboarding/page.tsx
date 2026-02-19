import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from '@/components/onboarding/onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()

  // 1. Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Check if user is already onboarded (has a role)
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (userRoles) {
    redirect('/dashboard')
  }

  // 3. Render onboarding form
  return <OnboardingForm />
}