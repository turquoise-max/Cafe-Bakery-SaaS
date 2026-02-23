import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyInventoryActions() {
  console.log("Verifying Inventory Actions...");

  // 1. Get a test user and store
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, email")
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error("Error fetching user:", userError);
    return;
  }
  const userId = users[0].id;
  console.log(`Test User ID: ${userId}`);

  const { data: userRole, error: roleError } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", userId)
    .single();

  if (roleError || !userRole) {
    console.error("Error fetching user role:", roleError);
    return;
  }
  const storeId = userRole.store_id;
  console.log(`Test Store ID: ${storeId}`);

  // 2. Create a test item
  const testItemCode = `TEST-INV-${Date.now()}`;
  const { data: item, error: itemError } = await supabase
    .from("items")
    .insert({
      store_id: storeId,
      name: "Test Inventory Item",
      code: testItemCode,
      type: "raw",
      base_unit: "kg",
      safety_stock: 10,
      is_active: true
    })
    .select()
    .single();

  if (itemError) {
    console.error("Error creating test item:", itemError);
    return;
  }
  console.log(`Created test item: ${item.id} (${item.code})`);

  // 3. Test Process Inbound (Simulate)
  console.log("\n--- Testing Process Inbound ---");
  const inboundQuantity = 50;
  const unitPrice = 1000;

  // Create PO
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      store_id: storeId,
      status: "received",
      order_date: new Date().toISOString(),
      received_date: new Date().toISOString(),
      created_by: userId,
      total_amount: inboundQuantity * unitPrice
    })
    .select()
    .single();

  if (poError) {
    console.error("Error creating PO:", poError);
    return;
  }
  console.log(`Created PO: ${po.id}`);

  // Create PO Item (This should trigger inventory update)
  const { data: poItem, error: poItemError } = await supabase
    .from("purchase_order_items")
    .insert({
      purchase_order_id: po.id,
      item_id: item.id,
      ordered_quantity: inboundQuantity,
      received_quantity: inboundQuantity,
      unit: "kg",
      unit_price: unitPrice
    })
    .select()
    .single();

  if (poItemError) {
    console.error("Error creating PO Item:", poItemError);
    return;
  }
  console.log(`Created PO Item: ${poItem.id}`);

  // Verify Inventory Update
  const { data: inventoryAfterInbound, error: invError1 } = await supabase
    .from("inventory")
    .select("*")
    .eq("store_id", storeId)
    .eq("item_id", item.id)
    .single();

  if (invError1) {
    console.error("Error fetching inventory after inbound:", invError1);
  } else {
    console.log(`Inventory after inbound: ${inventoryAfterInbound.theoretical_quantity} (Expected: ${inboundQuantity})`);
    if (Number(inventoryAfterInbound.theoretical_quantity) === inboundQuantity) {
      console.log("SUCCESS: Inbound updated inventory correctly.");
    } else {
      console.error("FAILURE: Inbound inventory update mismatch.");
    }
  }

  // 4. Test Update Physical Count (Simulate)
  console.log("\n--- Testing Update Physical Count ---");
  const physicalQuantity = 45; // 5 units missing
  const reason = "Test Adjustment";

  // Start Physical Count
  const { data: countId, error: startError } = await supabase.rpc('start_physical_count', {
    p_store_id: storeId,
    p_count_date: new Date().toISOString(),
    p_zone: 'Test Zone',
    p_user_id: userId
  });

  if (startError) {
    console.error("Error starting physical count:", startError);
    return;
  }
  console.log(`Started Physical Count: ${countId}`);

  // Record Count Item
  const { error: recordError } = await supabase.rpc('record_count_item', {
    p_count_id: countId,
    p_item_id: item.id,
    p_counted_quantity: physicalQuantity,
    p_unit: "kg",
    p_notes: reason
  });

  if (recordError) {
    console.error("Error recording count item:", recordError);
    return;
  }
  console.log("Recorded count item.");

  // Complete Physical Count
  const { error: completeError } = await supabase.rpc('complete_physical_count', {
    p_count_id: countId
  });

  if (completeError) {
    console.error("Error completing physical count:", completeError);
    return;
  }
  console.log("Completed physical count.");

  // Verify Inventory Update
  const { data: inventoryAfterCount, error: invError2 } = await supabase
    .from("inventory")
    .select("*")
    .eq("store_id", storeId)
    .eq("item_id", item.id)
    .single();

  if (invError2) {
    console.error("Error fetching inventory after count:", invError2);
  } else {
    console.log(`Inventory after count: ${inventoryAfterCount.theoretical_quantity} (Expected: ${physicalQuantity})`);
    console.log(`Physical Quantity: ${inventoryAfterCount.physical_quantity} (Expected: ${physicalQuantity})`);
    
    if (Number(inventoryAfterCount.theoretical_quantity) === physicalQuantity && 
        Number(inventoryAfterCount.physical_quantity) === physicalQuantity) {
      console.log("SUCCESS: Physical count updated inventory correctly.");
    } else {
      console.error("FAILURE: Physical count inventory update mismatch.");
    }
  }

  // Verify Transaction Log for Adjustment
  const { data: transactions, error: transError } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("store_id", storeId)
    .eq("item_id", item.id)
    .eq("transaction_type", "adjustment")
    .order("created_at", { ascending: false })
    .limit(1);

  if (transError) {
    console.error("Error fetching transaction log:", transError);
  } else if (transactions.length > 0) {
    console.log(`Adjustment transaction found: ${transactions[0].quantity} (Expected: ${physicalQuantity - inboundQuantity})`);
    if (Number(transactions[0].quantity) === (physicalQuantity - inboundQuantity)) {
        console.log("SUCCESS: Adjustment transaction recorded correctly.");
    } else {
        console.error("FAILURE: Adjustment transaction quantity mismatch.");
    }
  } else {
    console.error("FAILURE: No adjustment transaction found.");
  }

  // 5. Test Sales Deduction (Simulate)
  console.log("\n--- Testing Sales Deduction ---");
  
  // Create a finished product (Croissant)
  const productCode = `TEST-PROD-${Date.now()}`;
  const { data: product, error: productError } = await supabase
    .from("items")
    .insert({
      store_id: storeId,
      name: "Test Croissant",
      code: productCode,
      type: "finished",
      base_unit: "ea",
      sale_price: 5000,
      is_active: true
    })
    .select()
    .single();

  if (productError) {
    console.error("Error creating product:", productError);
    return;
  }
  console.log(`Created product: ${product.id} (${product.code})`);

  // Create Recipe (Croissant -> 0.1kg Test Inventory Item)
  const requiredQuantity = 0.1; // 100g
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      store_id: storeId,
      output_item_id: product.id,
      output_quantity: 1,
      version: 1,
      is_active: true
    })
    .select()
    .single();

  if (recipeError) {
    console.error("Error creating recipe:", recipeError);
    return;
  }

  const { error: recipeItemError } = await supabase
    .from("recipe_items")
    .insert({
      recipe_id: recipe.id,
      input_item_id: item.id,
      quantity: requiredQuantity,
      unit: "kg"
    });

  if (recipeItemError) {
    console.error("Error creating recipe item:", recipeItemError);
    return;
  }
  console.log("Created recipe linking Product -> Material");

  // Refresh Materialized View (Important!)
  await supabase.rpc('refresh_materialized_view', { view_name: 'mv_flattened_bom' }); 
  // Note: You need to create this RPC if it doesn't exist, or just hope the view is auto-refreshed or is a normal view. 
  // For this test, let's assume it might need refresh or check if we can skip it if it's a normal view.
  // Actually, checking schema might be hard from here. Let's try to just run sales and see.
  // If it fails, we know we need to refresh.
  
  // To be safe, let's try to call refresh via SQL execution if possible, but RPC is safer.
  // I will check if I can run raw SQL. Supabase client doesn't support raw SQL easily without RPC.
  // Let's assume for now that we might need to rely on the view being up to date.
  // Wait, I haven't created 'refresh_materialized_view' RPC. 
  // I should probably add a migration to add this RPC if I want to support it properly.
  // But first, let's see if the sales deduction works.

  const saleQuantity = 10;
  const expectedDeduction = saleQuantity * requiredQuantity; // 10 * 0.1 = 1.0 kg

  // Create Sale
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      store_id: storeId,
      sale_date: new Date().toISOString(),
      total_amount: saleQuantity * 5000,
      channel: "pos"
    })
    .select()
    .single();

  if (saleError) {
    console.error("Error creating sale:", saleError);
    return;
  }

  // Create Sale Item (Trigger should fire)
  const { error: saleItemError } = await supabase
    .from("sales_items")
    .insert({
      sale_id: sale.id,
      item_id: product.id,
      quantity: saleQuantity,
      unit_price: 5000
    });

  if (saleItemError) {
    console.error("Error creating sale item:", saleItemError);
    return;
  }
  console.log(`Created Sale of ${saleQuantity} Croissants`);

  // Verify Inventory Deduction
  const { data: inventoryAfterSale, error: invError3 } = await supabase
    .from("inventory")
    .select("*")
    .eq("store_id", storeId)
    .eq("item_id", item.id)
    .single();

  if (invError3) {
    console.error("Error fetching inventory after sale:", invError3);
  } else {
    // Previous inventory was 45 (after physical count)
    // Deduction should be 1.0
    // Expected: 44
    const expectedInventory = 45 - expectedDeduction;
    console.log(`Inventory after sale: ${inventoryAfterSale.theoretical_quantity} (Expected: ${expectedInventory})`);
    
    if (Math.abs(Number(inventoryAfterSale.theoretical_quantity) - expectedInventory) < 0.001) {
      console.log("SUCCESS: Sales deduction updated inventory correctly.");
    } else {
      console.error("FAILURE: Sales deduction inventory update mismatch.");
      console.log(`Note: If mismatch is huge (e.g. no change), check if mv_flattened_bom is up to date.`);
    }
  }
  
  // Cleanup
  console.log("\n--- Cleanup ---");
  await supabase.from("sales_items").delete().eq("sale_id", sale.id); // Trigger might try to revert? No, trigger is usually only for INSERT/UPDATE. 
  // Wait, if I delete sales_items, trigger might trigger something if I defined ON DELETE.
  // The sales trigger in 20240220000007_update_inventory_triggers.sql only defines INSERT/UPDATE. So deleting won't revert inventory.
  await supabase.from("sales").delete().eq("id", sale.id);
  await supabase.from("recipe_items").delete().eq("recipe_id", recipe.id);
  await supabase.from("recipes").delete().eq("id", recipe.id);
  await supabase.from("items").delete().eq("id", product.id);
  // ... and the rest of the cleanup

  await supabase.from("purchase_order_items").delete().eq("purchase_order_id", po.id);
  await supabase.from("purchase_orders").delete().eq("id", po.id);
  await supabase.from("physical_count_items").delete().eq("physical_count_id", countId);
  await supabase.from("physical_counts").delete().eq("id", countId);
  await supabase.from("inventory_transactions").delete().eq("item_id", item.id);
  await supabase.from("inventory").delete().eq("item_id", item.id);
  await supabase.from("items").delete().eq("id", item.id);
  console.log("Cleanup completed.");
}

verifyInventoryActions();