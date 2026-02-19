const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  try {
    await client.connect();
    
    console.log('--- Auth Users ---');
    const authRes = await client.query('SELECT id, email, created_at FROM auth.users');
    console.table(authRes.rows);

    console.log('\n--- Public Users ---');
    const publicRes = await client.query('SELECT * FROM public.users');
    console.table(publicRes.rows);

    console.log('\n--- User Roles ---');
    const rolesRes = await client.query('SELECT * FROM public.user_roles');
    console.table(rolesRes.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

inspect();