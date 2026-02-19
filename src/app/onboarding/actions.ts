'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type State = {
  message?: string | null
  errors?: {
    orgName?: string[]
    storeName?: string[]
    storeType?: string[]
  }
}

export async function createOrganizationAndStore(prevState: State, formData: FormData): Promise<State> {
  const supabase = await createClient()

  // 1. Authenticate User
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 2. Validate Input
  const orgName = formData.get('orgName') as string
  const storeName = formData.get('storeName') as string
  const storeType = formData.get('storeType') as string
  const includeSampleData = formData.get('includeSampleData') === 'on'

  const errors: State['errors'] = {}
  if (!orgName) {
    errors.orgName = ['Organization name is required.']
  }
  if (!storeName) {
    errors.storeName = ['Store name is required.']
  }
  if (!storeType) {
    errors.storeType = ['Store type is required.']
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      message: 'Missing Fields. Failed to Create Organization and Store.',
    }
  }

  // 3. Call RPC function for transactional creation
  const { data, error } = await supabase.rpc('create_initial_organization_v2', {
    p_org_name: orgName,
    p_store_name: storeName,
    p_store_type: storeType,
    p_include_sample_data: includeSampleData,
  })

  if (error) {
    console.error('Failed to create organization and store:', error)
    return {
      message: 'Failed to create organization and store. Please try again.',
    }
  }

  // Check if organization already exists (idempotency)
  if (data && (data as any).already_exists) {
    console.log('Organization already exists for user, redirecting to dashboard.')
  }

  // 4. Revalidate and Redirect
  // Clear all caches to ensure the new role is recognized
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
