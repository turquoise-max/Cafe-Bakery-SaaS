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
  const includeSampleData = formData.get('includeSampleData') === 'true'
  
  // Parse JSON fields
  const additionalStoresStr = formData.get('additionalStores') as string
  const invitationsStr = formData.get('invitations') as string
  
  let additionalStores: { name: string }[] = []
  let invitations: { email: string; role: string }[] = []

  try {
    if (additionalStoresStr) additionalStores = JSON.parse(additionalStoresStr)
    if (invitationsStr) invitations = JSON.parse(invitationsStr)
  } catch (e) {
    console.error("Failed to parse JSON fields", e)
  }

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

  // 3. Call RPC function for initial creation (Org + 1st Store)
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

  const resultData = data as any;
  
  // Check if organization already exists (idempotency)
  if (resultData && resultData.already_exists) {
    console.log('Organization already exists for user, redirecting to dashboard.')
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  const organizationId = resultData.organization_id;
  const firstStoreId = resultData.store_id;

  // 4. Create Additional Stores
  if (additionalStores.length > 0 && organizationId) {
    for (const store of additionalStores) {
      if (!store.name) continue;
      
      const code = (store.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000)).replace(/[^A-Z0-9]/g, '');
      
      // Create Store
      const { data: newStore, error: storeError } = await supabase
        .from('stores')
        .insert({
          organization_id: organizationId,
          name: store.name,
          code: code,
          settings: { type: storeType }
        })
        .select()
        .single();

      if (storeError) {
        console.error(`Failed to create additional store ${store.name}:`, storeError);
        continue;
      }

      // Assign Owner Role
      if (newStore) {
        await supabase.from('user_roles').insert({
          user_id: user.id,
          organization_id: organizationId,
          store_id: newStore.id,
          role: 'owner'
        });
        
        // Create Sample Data for additional stores if requested
        if (includeSampleData) {
           await supabase.rpc('create_sample_data', {
             p_store_id: newStore.id,
             p_store_type: storeType
           });
        }
      }
    }
  }

  // 5. Create Invitations
  if (invitations.length > 0 && firstStoreId) {
    const invitesToInsert = invitations.map(invite => ({
      store_id: firstStoreId,
      email: invite.email,
      role: invite.role,
      invited_by: user.id
    }));

    const { error: inviteError } = await supabase
      .from('store_invitations')
      .insert(invitesToInsert);

    if (inviteError) {
      console.error('Failed to create invitations:', inviteError);
      // Don't fail the whole process for invitation errors
    }
  }

  // 6. Revalidate and Redirect
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}