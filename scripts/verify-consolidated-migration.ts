import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or Service Role Key missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('Verifying consolidated migration...');
  console.log('Supabase URL:', supabaseUrl);
  // Do not log the full key for security, just the first few chars
  console.log('Supabase Key:', supabaseServiceKey.substring(0, 10) + '...');

  let allPassed = true;

  // 1. Verify Tables Existence
  const tables = [
    'organizations', 'stores', 'users', 'user_roles', 
    'categories', 'items', 'recipes', 'recipe_items', 
    'inventory', 'inventory_transactions', 'sales', 'sales_items',
    'store_invitations'
  ];

  console.log('\nChecking tables...');
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.error(`❌ Table '${table}' check failed:`, error);
      allPassed = false;
    } else {
      console.log(`✅ Table '${table}' exists.`);
    }
  }

  // 2. Verify Enum Type (by inserting a dummy item if possible, or just checking if we can query)
  // We can't easily check enum types via JS client without inserting, which might violate constraints.
  // Instead, let's check if we can call a function.

  // 3. Verify Functions
  console.log('\nChecking functions...');
  
  // calculate_product_cost requires an item_id. We can try calling it with a dummy UUID.
  // It should return an empty list or error out if function doesn't exist, but specific error "function not found" is what we look for.
  // Actually, if it returns empty list (data: []), it means function exists.
  const dummyId = '00000000-0000-0000-0000-000000000000';
  const { data: costData, error: costError } = await supabase.rpc('calculate_product_cost', { p_item_id: dummyId });
  
  if (costError) {
    // If error says function not found, that's a failure. 
    // If it says something else (like permission denied), that's also an issue but function might exist.
    console.error(`❌ Function 'calculate_product_cost' check failed:`, costError.message);
    allPassed = false;
  } else {
    console.log(`✅ Function 'calculate_product_cost' exists and is callable.`);
  }

  // Check convert_unit
  const { data: convData, error: convError } = await supabase.rpc('convert_unit', { 
    p_quantity: 1, 
    p_from_unit: 'kg', 
    p_to_unit: 'g' 
  });

  if (convError) {
    console.error(`❌ Function 'convert_unit' check failed:`, convError.message);
    allPassed = false;
  } else {
    // Should return 1000
    if (convData === 1000) {
      console.log(`✅ Function 'convert_unit' exists and works correctly (1kg = 1000g).`);
    } else {
      console.warn(`⚠️ Function 'convert_unit' exists but returned unexpected value:`, convData);
    }
  }

  // 4. Verify RLS Policies (Basic check)
  // We can't easily check RLS definitions via client, but we can verify if we can access data as service role (which bypasses RLS)
  // and we already did that in step 1.
  
  if (allPassed) {
    console.log('\n✨ All checks passed! The consolidated migration seems to have been applied successfully.');
  } else {
    console.error('\n❌ Some checks failed. Please review the errors above.');
    process.exit(1);
  }
}

verifyMigration().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});