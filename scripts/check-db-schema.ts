import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key (first 10 chars):', supabaseServiceKey?.substring(0, 10));

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('Checking schema...');

  // Check store_invitations columns
  const { data: invitations, error: invError } = await supabase
    .from('store_invitations')
    .select('*')
    .limit(1);

  if (invError) {
    console.error('Error fetching invitations:', invError);
  } else {
    // Get column names from the result object keys if any row exists, 
    // or we can't really know unless we use rpc to inspect information_schema
    console.log('store_invitations query success.');
  }

  // Check triggers on auth.users using a raw SQL query via rpc if possible
  // Since we can't easily run SQL on auth schema via client library without a function,
  // we will try to invoke a function that lists triggers if we had one.
  // But we don't.
  
  // Let's create a temporary RPC to list triggers
  const { error: rpcError } = await supabase.rpc('create_store', { 
    store_name: 'Temp Store', 
    store_code: 'TEMP' 
  }); 
  // This was just to check connection.

  console.log('Checking if handle_invitation_acceptance function exists...');
  // We can't directly check function existence easily without SQL.
  
  // However, we can try to call the invitation flow manually and see logs if we had access to server logs.
  
  console.log('To debug triggers, please run the following SQL in Supabase SQL Editor:');
  console.log(`
    SELECT event_object_schema, event_object_table, trigger_name, action_timing, action_orientation, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_table = 'users' 
    AND event_object_schema = 'auth';
  `);

  console.log('Also check if handle_invitation_acceptance exists:');
  console.log(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_name = 'handle_invitation_acceptance';
  `);
}

checkSchema();