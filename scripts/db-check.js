const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString: connectionString,
});

async function checkDatabase() {
  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tables in public schema:');
    res.rows.forEach(row => console.log(` - ${row.table_name}`));

    const funcRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `);

    console.log('\nFunctions in public schema:');
    funcRes.rows.forEach(row => console.log(` - ${row.routine_name}`));

  } catch (err) {
    console.error('Database check error', err);
  } finally {
    await client.end();
  }
}

checkDatabase();