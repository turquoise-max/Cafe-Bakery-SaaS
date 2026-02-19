const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
      const password = process.env.SUPABASE_DB_PASSWORD;
      if (projectRef && password) {
        connectionString = `postgres://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
      }
    }
}

connectionString = connectionString.replace(':6543', ':5432').replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const tables = [
    'purchase_order_items',
    'inventory',
    'inventory_transactions',
    'inventory_lots'
];

async function inspectTable(tableName) {
  try {
    const columnsRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    console.log(`\n--- ${tableName} ---`);
    console.log('Columns:', columnsRes.rows);

    const policiesRes = await client.query(`
      SELECT *
      FROM pg_policies
      WHERE tablename = $1
    `, [tableName]);
    console.log('Policies:', policiesRes.rows);

    const rlsRes = await client.query(`
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = $1
    `, [tableName]);
    console.log('RLS enabled:', rlsRes.rows);

  } catch (err) {
    console.error(`Error inspecting ${tableName}:`, err);
  }
}

async function run() {
  await client.connect();
  for (const table of tables) {
      await inspectTable(table);
  }
  await client.end();
}

run();