// scripts/reset-db.js
const { Client } = require('pg');
const fs = require('fs');

// Try .env.local first, then .env
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config({ path: '.env' });
}

async function resetDatabase() {
  // Use connection pooling if available, otherwise direct connection
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Error: DATABASE_URL or DIRECT_URL environment variable is not set.');
    process.exit(1);
  }

  console.log(`Using connection string: ${connectionString.replace(/:[^:]*@/, ':****@')}`);

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false, // For Supabase, often needed
    },
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    console.warn('WARNING: This will delete ALL data and schema from the database.');

    console.log('Starting reset process...');

    // Drop public schema and recreate it. This removes all tables, types, functions, etc.
    // CASCADE is important to remove dependent objects.
    console.log('Dropping and recreating public schema...');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    
    // Restore default permissions
    await client.query('GRANT ALL ON SCHEMA public TO postgres;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    
    console.log('Public schema reset successfully.');

    // Delete users from auth.users (Supabase specific)
    // Note: This requires the service_role key or appropriate permissions if running as postgres user
    console.log('Deleting all users from auth.users...');
    try {
        await client.query('DELETE FROM auth.users;');
        console.log('All users deleted.');
    } catch (authError) {
        console.warn('Warning: Could not delete users from auth.users. You might need higher privileges or use the Supabase dashboard.');
        console.warn('Error details:', authError.message);
    }

    console.log('Database reset completed successfully.');

  } catch (err) {
    console.error('Database reset failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();