const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

console.log('Testing connection from ENV...');

// Use the connection string from .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

// Mask password for logging
const maskedString = connectionString.replace(/:[^:@]+@/, ':****@');
console.log('Connection String:', maskedString);

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000 // 30s timeout
});

async function debug() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('\n--- Users (auth.users) ---');
    const users = await client.query('SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5');
    console.table(users.rows);

    console.log('\n--- Organizations ---');
    const orgs = await client.query('SELECT id, name, created_at FROM public.organizations ORDER BY created_at DESC LIMIT 5');
    console.table(orgs.rows);

    console.log('\n--- Stores ---');
    const stores = await client.query('SELECT id, name, organization_id FROM public.stores ORDER BY created_at DESC LIMIT 5');
    console.table(stores.rows);

    console.log('\n--- User Roles ---');
    const roles = await client.query('SELECT user_id, organization_id, store_id, role FROM public.user_roles');
    console.table(roles.rows);
    
    // Check for potential orphans
    if (users.rows.length > 0) {
        const userId = users.rows[0].id;
        console.log(`\n--- Checking specifics for latest user: ${userId} ---`);
        
        const userRole = await client.query('SELECT * FROM public.user_roles WHERE user_id = $1', [userId]);
        console.log(`User roles found: ${userRole.rows.length}`);
        console.table(userRole.rows);
        
        if (userRole.rows.length === 0) {
            console.log("WARNING: Latest user has NO roles!");
        }
    }

    await client.end();
  } catch (err) {
    console.error('Connection Error:', err);
  }
}

debug();