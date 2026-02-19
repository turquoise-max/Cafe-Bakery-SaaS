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
    console.error('Error: Could not determine DB connection string.');
    process.exit(1);
}

connectionString = connectionString.replace(':6543', ':5432').replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function runTest() {
    let orgId, storeId, itemId, supplierId, poId, poItemId;

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected.');

        console.log('\n--- [SETUP] Creating Test Data ---');

        // 1. Create Organization
        const orgRes = await client.query(`
            INSERT INTO organizations (name, slug)
            VALUES ('Purchase Trigger Test Org ' || gen_random_uuid(), 'pt-test-org-' || gen_random_uuid())
            RETURNING id
        `);
        orgId = orgRes.rows[0].id;
        console.log(`Organization created: ${orgId}`);

        // 2. Create Store
        const storeRes = await client.query(`
            INSERT INTO stores (organization_id, name, code)
            VALUES ($1, 'Purchase Test Store', 'PTEST01')
            RETURNING id
        `, [orgId]);
        storeId = storeRes.rows[0].id;
        console.log(`Store created: ${storeId}`);

        // 3. Create Item
        const itemRes = await client.query(`
            INSERT INTO items (store_id, name, type, base_unit, purchase_unit)
            VALUES ($1, 'Purchase Test Item', 'raw', 'kg', 'kg')
            RETURNING id
        `, [storeId]);
        itemId = itemRes.rows[0].id;
        console.log(`Item created: ${itemId}`);

        // 4. Create Supplier
        const supplierRes = await client.query(`
            INSERT INTO suppliers (store_id, name) VALUES ($1, 'Test Supplier') RETURNING id
        `, [storeId]);
        supplierId = supplierRes.rows[0].id;
        console.log(`Supplier created: ${supplierId}`);

        // 5. Create Purchase Order
        const poRes = await client.query(`
            INSERT INTO purchase_orders (store_id, supplier_id, status, order_date, received_date)
            VALUES ($1, $2, 'ordered', NOW(), NOW())
            RETURNING id
        `, [storeId, supplierId]);
        poId = poRes.rows[0].id;
        console.log(`Purchase Order created: ${poId}`);


        console.log('\n--- [TEST 1] Insert PO Item with received_quantity > 0 ---');
        
        const poItemRes = await client.query(`
            INSERT INTO purchase_order_items (purchase_order_id, item_id, ordered_quantity, received_quantity, unit, unit_price)
            VALUES ($1, $2, 100, 50, 'kg', 10.0)
            RETURNING id
        `, [poId, itemId]);
        poItemId = poItemRes.rows[0].id;
        console.log(`PO Item inserted: ${poItemId} (Ordered: 100, Received: 50)`);

        // Verify Inventory
        let invRes = await client.query(`
            SELECT theoretical_quantity FROM inventory WHERE store_id = $1 AND item_id = $2
        `, [storeId, itemId]);
        let qty = parseFloat(invRes.rows[0]?.theoretical_quantity || 0);
        console.log(`Inventory Quantity: ${qty} (Expected: 50)`);
        if (qty !== 50) throw new Error('Inventory update failed on insert!');

        // Verify Transaction
        let transRes = await client.query(`
            SELECT quantity, transaction_type FROM inventory_transactions 
            WHERE item_id = $1 AND reference_id = $2
        `, [itemId, poId]);
        console.log(`Transactions found: ${transRes.rowCount}`);
        if (transRes.rowCount === 0) throw new Error('Transaction creation failed on insert!');
        if (parseFloat(transRes.rows[0].quantity) !== 50) throw new Error('Transaction quantity mismatch!');

        // Verify Lot
        let lotRes = await client.query(`
            SELECT * FROM inventory_lots 
            WHERE item_id = $1 AND purchase_order_item_id = $2
        `, [itemId, poItemId]);
        console.log(`Lots found: ${lotRes.rowCount}`);

        if (lotRes.rowCount === 0) {
            // Debug: Check if ANY lot exists
            const allLots = await client.query(`SELECT * FROM inventory_lots`);
            console.log('All Lots in DB:', allLots.rows);
            throw new Error('Lot creation failed on insert!');
        }
        if (parseFloat(lotRes.rows[0].quantity) !== 50) throw new Error('Lot quantity mismatch!');


        console.log('\n--- [TEST 2] Update PO Item received_quantity ---');

        await client.query(`
            UPDATE purchase_order_items 
            SET received_quantity = 80 
            WHERE id = $1
        `, [poItemId]);
        console.log('Updated received_quantity to 80 (+30 increase)');

        // Verify Inventory (Should be 80 now)
        invRes = await client.query(`
            SELECT theoretical_quantity FROM inventory WHERE store_id = $1 AND item_id = $2
        `, [storeId, itemId]);
        qty = parseFloat(invRes.rows[0]?.theoretical_quantity || 0);
        console.log(`Inventory Quantity: ${qty} (Expected: 80)`);
        if (qty !== 80) throw new Error('Inventory update failed on update!');

        // Verify Transaction (New transaction for +30)
        transRes = await client.query(`
            SELECT quantity, transaction_type FROM inventory_transactions 
            WHERE item_id = $1 AND reference_id = $2
            ORDER BY created_at DESC
        `, [itemId, poId]);
        console.log(`Total transactions: ${transRes.rowCount}`);
        // We expect the latest one to be +30
        const latestTransQty = parseFloat(transRes.rows[0].quantity);
        console.log(`Latest transaction quantity: ${latestTransQty} (Expected: 30)`);
        if (latestTransQty !== 30) throw new Error('Transaction for update failed!');

        // Verify Lot (New lot for +30)
        lotRes = await client.query(`
            SELECT quantity, remaining_quantity FROM inventory_lots 
            WHERE item_id = $1 AND purchase_order_item_id = $2
            ORDER BY created_at DESC
        `, [itemId, poItemId]);
        console.log(`Total lots: ${lotRes.rowCount}`);
        // We expect a new lot or update to existing lot?
        // The trigger logic:
        // INSERT INTO inventory_lots ...
        // It inserts a NEW lot for the DIFFERENCE.
        
        const latestLotQty = parseFloat(lotRes.rows[0].quantity);
        console.log(`Latest lot quantity: ${latestLotQty} (Expected: 30)`);
        if (latestLotQty !== 30) throw new Error('Lot creation for update failed!');

        console.log('\n✅ ALL PURCHASE TRIGGER TESTS PASSED!');

    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        if (orgId) {
            console.log('\n--- [CLEANUP] ---');
            try {
                // Manually delete dependent records to avoid FK constraint issues
                if (poId) await client.query(`DELETE FROM purchase_orders WHERE id = $1`, [poId]);
                await client.query(`DELETE FROM organizations WHERE id = $1`, [orgId]);
                console.log('Test data cleaned up.');
            } catch (cleanupErr) {
                console.error('Cleanup failed:', cleanupErr);
            }
        }
        await client.end();
    }
}

runTest();