const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // I need this for admin tasks

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  const email = 'admin@example.com';
  const password = 'password123';
  const name = 'Admin User';
  const orgName = 'BSM Bakery';
  const storeName = 'Main Store';

  console.log('Creating admin user...');

  // 1. Sign up user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  if (authError) {
    console.error('Error creating user:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log(`User created with ID: ${userId}`);

  // 2. Create Organization
  console.log('Creating organization...');
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug: 'bsm-bakery',
      subscription_plan: 'enterprise'
    })
    .select()
    .single();

  if (orgError) {
    console.error('Error creating organization:', orgError.message);
    return;
  }

  const orgId = orgData.id;
  console.log(`Organization created with ID: ${orgId}`);

  // 3. Create Store
  console.log('Creating store...');
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .insert({
      organization_id: orgId,
      name: storeName,
      code: 'MAIN'
    })
    .select()
    .single();

  if (storeError) {
    console.error('Error creating store:', storeError.message);
    return;
  }

  const storeId = storeData.id;
  console.log(`Store created with ID: ${storeId}`);

  // 4. Create User Profile (public.users) - The trigger might have done this, but let's check/update
  // The trigger on auth.users usually creates public.users. 
  // Let's update the name just in case.
  const { error: profileError } = await supabase
    .from('users')
    .update({ name })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating profile:', profileError.message);
    // It might be that the trigger didn't fire or row doesn't exist?
    // Let's try upsert
    const { error: upsertError } = await supabase
        .from('users')
        .upsert({ id: userId, email, name });
    
    if (upsertError) {
        console.error('Error upserting profile:', upsertError.message);
        return;
    }
  }

  // 5. Assign Role
  console.log('Assigning role...');
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      organization_id: orgId,
      store_id: storeId,
      role: 'owner'
    });

  if (roleError) {
    console.error('Error assigning role:', roleError.message);
    return;
  }

  console.log('Admin setup complete!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

createAdmin();