import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPolicies() {
  console.log('Verifying RLS policies on stores table...');

  // 1. Create a test user
  const email = `test-policy-${Date.now()}@example.com`;
  const password = 'password123';
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError || !authData.user) {
    console.error('Failed to create test user:', authError);
    return;
  }
  
  const userId = authData.user.id;
  console.log(`Created test user: ${userId}`);

  try {
    // 2. Create organization and store using admin client (bypassing RLS)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org Policy', slug: `test-org-policy-${Date.now()}` })
      .select()
      .single();

    if (orgError || !org) {
      throw new Error(`Failed to create org: ${orgError?.message}`);
    }
    console.log(`Created org: ${org.id}`);

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({ organization_id: org.id, name: 'Test Store Policy', code: 'TSP' })
      .select()
      .single();

    if (storeError || !store) {
      throw new Error(`Failed to create store: ${storeError?.message}`);
    }
    console.log(`Created store: ${store.id}`);

    // 3. Assign 'manager' role to user for this store
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        organization_id: org.id,
        store_id: store.id,
        role: 'manager'
      });

    if (roleError) {
      throw new Error(`Failed to assign role: ${roleError.message}`);
    }
    console.log('Assigned manager role to user');

    // 4. Sign in as the user to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError || !signInData.session) {
      throw new Error(`Failed to sign in: ${signInError?.message}`);
    }

    // 5. Try to update the store as the user
    // We need a new client with the user's access token
    const userClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      global: {
        headers: {
          Authorization: `Bearer ${signInData.session.access_token}`
        }
      }
    });

    const { data: updateData, error: updateError } = await userClient
      .from('stores')
      .update({ name: 'Updated Store Name' })
      .eq('id', store.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Policy verification failed: Update denied', updateError);
    } else {
      console.log('✅ Policy verification successful: Update allowed');
      console.log('Updated store:', updateData);
    }

    // Clean up
    console.log('Cleaning up...');
    // Delete organization (should cascade delete store)
    await supabase.from('organizations').delete().eq('id', org.id);
    // Delete user
    await supabase.auth.admin.deleteUser(userId);
    console.log('Cleanup completed');

  } catch (err: any) {
    console.error('Error during verification:', err.message);
    // Attempt cleanup
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (cleanupErr) {
      console.error('Failed to cleanup user:', cleanupErr);
    }
  }
}

verifyPolicies();