const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserRoles() {
  console.log('Checking user_roles table...');

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select(`
      *,
      user:users(email),
      organization:organizations(name),
      store:stores(name)
    `);

  if (error) {
    console.error('Error fetching user roles:', error.message);
    return;
  }

  console.log('User Roles:', JSON.stringify(roles, null, 2));
}

checkUserRoles();