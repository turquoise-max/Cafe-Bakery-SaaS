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
  const { data: existingRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .limit(1)

  if (existingRoles && existingRoles.length > 0) {
    redirect('/dashboard')
  }

  // 3. Render onboarding form
  return <OnboardingForm />
}