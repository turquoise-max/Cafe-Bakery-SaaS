const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Load .env file manually
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

// 2. Construct Connection String
let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
    // Try to construct from parts
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
      const password = process.env.SUPABASE_DB_PASSWORD;
      if (projectRef && password) {
        connectionString = `postgres://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
      }
    }
}

if (!connectionString) {
    console.error('Error: Could not determine DB connection string. Set POSTGRES_URL, DATABASE_URL or SUPABASE_DB_PASSWORD in .env');
    process.exit(1);
}

// Force Session Mode (port 5432) for reliability
connectionString = connectionString.replace(':6543', ':5432').replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');

console.log('Using connection string:', connectionString.replace(/:([^:@]+)@/, ':****@'));

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function runTest() {
    let orgId, storeId, flourId, breadId, recipeId;

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected.');

        // Listen for notices (e.g. RAISE NOTICE from PL/pgSQL)
        client.on('notice', (msg) => console.log('NOTICE:', msg.message));

        console.log('\n--- [SETUP] Creating Test Data ---');

        // 1. Create Organization
        const orgRes = await client.query(`
            INSERT INTO organizations (name, slug)
            VALUES ('Test Org ' || gen_random_uuid(), 'test-org-' || gen_random_uuid())
            RETURNING id
        `);
        orgId = orgRes.rows[0].id;
        console.log(`Organization created: ${orgId}`);

        // 2. Create Store
        const storeRes = await client.query(`
            INSERT INTO stores (organization_id, name, code)
            VALUES ($1, 'Test Store', 'TEST01')
            RETURNING id
        `, [orgId]);
        storeId = storeRes.rows[0].id;
        console.log(`Store created: ${storeId}`);

        // 3. Create Items
        const flourRes = await client.query(`
            INSERT INTO items (store_id, name, type, base_unit, purchase_unit)
            VALUES ($1, 'Flour', 'raw', 'kg', 'kg')
            RETURNING id
        `, [storeId]);
        flourId = flourRes.rows[0].id;
        console.log(`Item Flour created: ${flourId}`);

        const breadRes = await client.query(`
            INSERT INTO items (store_id, name, type, base_unit, sale_price)
            VALUES ($1, 'Bread', 'finished', 'ea', 5.0)
            RETURNING id
        `, [storeId]);
        breadId = breadRes.rows[0].id;
        console.log(`Item Bread created: ${breadId}`);

        // 4. Create Recipe (Bread = 0.5kg Flour)
        const recipeRes = await client.query(`
            INSERT INTO recipes (store_id, output_item_id, output_quantity, version)
            VALUES ($1, $2, 1, 1)
            RETURNING id
        `, [storeId, breadId]);
        recipeId = recipeRes.rows[0].id;

        await client.query(`
            INSERT INTO recipe_items (recipe_id, input_item_id, quantity, unit)
            VALUES ($1, $2, 0.5, 'kg')
        `, [recipeId, flourId]);
        console.log(`Recipe created: 1 Bread = 0.5kg Flour`);


        console.log('\n--- [STEP 1] Testing Inbound (Purchase Trigger) ---');

        // 1. Create Supplier & PO
        const supplierRes = await client.query(`
            INSERT INTO suppliers (store_id, name) VALUES ($1, 'Test Supplier') RETURNING id
        `, [storeId]);
        const supplierId = supplierRes.rows[0].id;

        const poRes = await client.query(`
            INSERT INTO purchase_orders (store_id, supplier_id, status, order_date)
            VALUES ($1, $2, 'ordered', NOW())
            RETURNING id
        `, [storeId, supplierId]);
        const poId = poRes.rows[0].id;

        // 2. Add PO Item (100kg Flour)
        console.log('Inserting PO Item (100kg Flour)...');
        await client.query(`
            INSERT INTO purchase_order_items (purchase_order_id, item_id, ordered_quantity, received_quantity, unit, unit_price)
            VALUES ($1, $2, 100, 100, 'kg', 2.5)
        `, [poId, flourId]);

        // 3. Check Inventory (Trigger should have created/updated inventory)
        const invRes = await client.query(`
            SELECT theoretical_quantity FROM inventory WHERE store_id = $1 AND item_id = $2
        `, [storeId, flourId]);
        
        let qty = invRes.rows[0]?.theoretical_quantity;
        console.log(`Inventory after purchase: ${qty} (Expected: 100)`);

        if (parseFloat(qty) !== 100) {
            throw new Error('Inbound inventory trigger failed! Inventory should be 100.');
        }
        console.log('✅ Inbound Trigger Test PASSED!');


        console.log('\n--- [STEP 2] Testing Outbound (Sales Trigger Removal) ---');
        
        // 1. Create Sale
        const saleRes = await client.query(`
            INSERT INTO sales (store_id, sale_date, total_amount, channel)
            VALUES ($1, NOW(), 50.0, 'pos')
            RETURNING id
        `, [storeId]);
        const saleId = saleRes.rows[0].id;

        // 2. Add Sale Item (10 Bread) -> Should NOT deduct Flour automatically
        console.log('Inserting Sale Item (10 Bread)...');
        await client.query(`
            INSERT INTO sales_items (sale_id, item_id, quantity, unit_price)
            VALUES ($1, $2, 10, 5.0)
        `, [saleId, breadId]);

        // 3. Verify Inventory Unchanged
        const invRes2 = await client.query(`
            SELECT theoretical_quantity FROM inventory WHERE store_id = $1 AND item_id = $2
        `, [storeId, flourId]);
        let qty2 = invRes2.rows[0]?.theoretical_quantity;
        console.log(`Inventory after sale: ${qty2} (Expected: 100)`);
        
        if (parseFloat(qty2) !== 100) {
             throw new Error('Sales trigger STILL ACTIVE! Inventory changed but shouldn\'t have.');
        } else {
             console.log('✅ Sales Trigger Removal Test PASSED!');
        }

        console.log('\n--- [CLEANUP] ---');
        await client.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
        console.log('Test data cleaned up.');

    } catch (err) {
        console.error('❌ Test Failed:', err);
        // Try cleanup even on fail
        if (orgId) {
             try { await client.query(`DELETE FROM organizations WHERE id = $1`, [orgId]); } catch(e){}
        }
    } finally {
        await client.end();
    }
}

runTest();