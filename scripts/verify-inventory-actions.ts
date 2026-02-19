import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

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

  // Cleanup
  console.log("\n--- Cleanup ---");
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