'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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
      
      // Create Store using RPC
      const { data: newStoreId, error: storeError } = await supabase.rpc('create_store_v2', {
        p_organization_id: organizationId,
        p_store_name: store.name,
        p_store_code: code,
        p_store_type: { type: storeType }
      });

      if (storeError) {
        console.error(`Failed to create additional store ${store.name}:`, storeError);
        continue;
      }

      // Create Sample Data for additional stores if requested
      if (newStoreId && includeSampleData) {
          await supabase.rpc('create_sample_data', {
            p_store_id: newStoreId,
            p_store_type: storeType
          });
      }
    }
  }

  // 5. Create Invitations & Send Emails
  if (invitations.length > 0 && firstStoreId) {
    const supabaseAdmin = createAdminClient();
    
    for (const invite of invitations) {
      // 1. Record invitation in DB
      const { error: inviteError } = await supabase
        .from('store_invitations')
        .insert({
          store_id: firstStoreId,
          email: invite.email,
          role: invite.role,
          invited_by: user.id
        });

      if (inviteError) {
        console.error(`Failed to create invitation record for ${invite.email}:`, inviteError);
        continue; 
      }

      // 2. Send actual invitation email via Supabase Auth
      const { error: mailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(invite.email, {
        data: {
          store_id: firstStoreId,
          role: invite.role,
          invited_by: user.id
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`
      });

      if (mailError) {
        console.error(`Failed to send invitation email to ${invite.email}:`, mailError);
        // Note: DB record exists but email failed. Ideally we should update status to 'failed'
      }
    }
  }

  // 6. Revalidate and Redirect
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}