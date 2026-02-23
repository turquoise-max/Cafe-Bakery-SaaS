const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or Service Role Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFunctions() {
  console.log('Checking for specific functions...');

  // We can query pg_proc via rpc if we had a function for it, but we don't.
  // Instead, we will try to call them with invalid arguments and see if we get "function not found" error.
  
  const functionsToCheck = [
    'create_store_v2',
    'create_initial_organization_v2',
    'create_sample_data',
    'is_store_admin',
    'get_low_stock_items'
  ];

  for (const func of functionsToCheck) {
    // Calling with empty object might trigger parameter mismatch error if function exists,
    // or "function not found" if it doesn't.
    const { error } = await supabase.rpc(func, {});
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.error(`❌ Function '${func}' does NOT exist.`);
      } else {
        // Parameter mismatch or other error means function exists
        console.log(`✅ Function '${func}' exists (Error: ${error.message}).`);
      }
    } else {
      console.log(`✅ Function '${func}' exists and executed successfully.`);
    }
  }
}

checkFunctions().catch(console.error);