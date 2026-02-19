const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Simple .env parser since we might not have dotenv installed in devDependencies
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {
    console.warn('Could not load .env file', e);
  }
}

loadEnv();

// Try to construct a direct connection string (port 5432) if possible
// Original: postgres://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
// Target: postgres://postgres.[ref]:[pass]@db.[ref].supabase.co:5432/postgres
let connectionString;

// Prioritize constructing a session mode connection string (port 5432) for migrations
// Strategy:
// 1. Try to use the host from DATABASE_URL but change port to 5432 and remove pgbouncer params
// 2. Fallback to direct URL construction if DATABASE_URL is not available
try {
  let dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  if (dbUrl) {
    // Modify to use port 5432 (Session Mode)
    // Replace port 6543 with 5432
    dbUrl = dbUrl.replace(':6543', ':5432');
    // Remove pgbouncer param
    dbUrl = dbUrl.replace('?pgbouncer=true', '');
    dbUrl = dbUrl.replace('&pgbouncer=true', '');
    
    console.log('Constructing session mode connection string (port 5432)...');
    connectionString = dbUrl;
  } else {
    // Fallback to constructing from parts if env vars are missing (unlikely)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
      const password = process.env.SUPABASE_DB_PASSWORD;
      
      if (projectRef && password) {
         // This failed previously with ENOTFOUND, but keeping as backup
        console.log(`Constructing direct connection string for project ${projectRef}...`);
        connectionString = `postgres://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
      }
    }
  }
} catch (e) {
  console.warn('Could not construct connection string:', e.message);
}

if (!connectionString) {
  connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
}

async function runMigration() {
  console.log('Using connection string:', connectionString.replace(/:([^:@]+)@/, ':****@'));
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database');

    /*
    const migrationFile = path.join(__dirname, '../supabase/migrations/20240101000009_fix_onboarding_rpc.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Running migration (Fix RPC)...');
    await client.query(sql);
    console.log('Migration completed successfully');
    
    // Also run the cleanup script
    const cleanupFile = path.join(__dirname, '../supabase/migrations/20240101000010_cleanup_orphans.sql');
    const cleanupSql = fs.readFileSync(cleanupFile, 'utf8');
    
    console.log('Running cleanup (Orphans)...');
    await client.query(cleanupSql);
    console.log('Cleanup completed successfully');
    */

    // Get migration file from command line argument
    const migrationFilePath = process.argv[2];
    
    if (migrationFilePath) {
      const absolutePath = path.isAbsolute(migrationFilePath) 
        ? migrationFilePath 
        : path.join(process.cwd(), migrationFilePath);
        
      if (fs.existsSync(absolutePath)) {
        console.log(`Reading migration file: ${absolutePath}`);
        const sql = fs.readFileSync(absolutePath, 'utf8');
        
        console.log(`Running migration (${path.basename(migrationFilePath)})...`);
        await client.query(sql);
        console.log('Migration completed successfully');
      } else {
        console.error(`File not found: ${absolutePath}`);
      }
    } else {
      console.log('No migration file specified. Usage: node scripts/run-migration.js path/to/migration.sql');
      
      // Fallback: Run Sales Trigger Migration (Default behavior)
      const salesTriggerFile = path.join(__dirname, '../supabase/migrations/20240101000008_sales_trigger.sql');
      if (fs.existsSync(salesTriggerFile)) {
        const salesTriggerSql = fs.readFileSync(salesTriggerFile, 'utf8');
        console.log('Running migration (Sales Trigger)...');
        await client.query(salesTriggerSql);
        console.log('Sales Trigger migration completed successfully');
      }
    }

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();