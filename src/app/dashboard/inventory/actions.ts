"use server";

import { createClient } from "@/lib/supabase/server";
import { InventoryItem } from "@/types/inventory";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface InventoryDashboardItem extends InventoryItem {
  isLowStock: boolean;
}

export async function getInventoryDashboardData(): Promise<InventoryDashboardItem[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) {
    // redirect("/onboarding");
    return []; // Return empty data instead of redirecting
  }

  const { data, error } = await supabase
    .from("inventory")
    .select(`
      *,
      item:items (
        id,
        name,
        code,
        type,
        base_unit,
        safety_stock,
        latest_purchase_price,
        category:categories (
          name
        )
      )
    `)
    .eq("store_id", userRole.store_id)
    .order("variance", { ascending: true });

  if (error) {
    console.error("Error fetching inventory:", error);
    throw new Error("Failed to fetch inventory");
  }

  // Transform data to include low stock logic
  const dashboardData: InventoryDashboardItem[] = (data as any[]).map((row) => {
    const safetyStock = row.item.safety_stock || 0;
    const currentStock = row.theoretical_quantity || 0;
    // Logic: Is current stock less than safety stock?
    // Only if safety stock is set (> 0) and inventory is managed
    const isLowStock = safetyStock > 0 && currentStock < safetyStock;

    return {
      ...row,
      isLowStock
    };
  });

  return dashboardData;
}

export async function getInventory() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) {
    // redirect("/onboarding");
    return []; // Return empty data instead of redirecting
  }

  const { data, error } = await supabase
    .from("inventory")
    .select(`
      *,
      item:items (
        id,
        name,
        code,
        type,
        base_unit,
        safety_stock,
        latest_purchase_price,
        category:categories (
          name
        )
      )
    `)
    .eq("store_id", userRole.store_id)
    .order("variance", { ascending: true });

  if (error) {
    console.error("Error fetching inventory:", error);
    throw new Error("Failed to fetch inventory");
  }

  return data as unknown as InventoryItem[];
}

export async function getSuppliers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) return [];

  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .eq("store_id", userRole.store_id)
    .eq("is_active", true)
    .order("name");

  return data || [];
}

// getUserStore는 @/app/dashboard/actions에서 import하여 사용하세요.

interface InboundItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
  expiryDate?: string;
}

export async function processInbound(supplierId: string | null, items: InboundItem[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) return { error: "Store not found" };
  const storeId = userRole.store_id;

  // 1. Create Purchase Order (Draft -> Received)
  // For Direct Inbound, we assume it's received immediately.
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      store_id: storeId,
      supplier_id: supplierId,
      status: "received", // Direct receive
      order_date: new Date().toISOString(),
      received_date: new Date().toISOString(),
      created_by: user.id,
      total_amount: items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    })
    .select()
    .single();

  if (poError) return { error: `Failed to create PO: ${poError.message}` };

  for (const item of items) {
    // A. Insert PO Item
    // We fetch item unit first
    const { data: itemData } = await supabase
      .from("items")
      .select("base_unit, latest_purchase_price")
      .eq("id", item.itemId)
      .single();

    if (!itemData) continue;

    const { data: poItem, error: poItemError } = await supabase
      .from("purchase_order_items")
      .insert({
        purchase_order_id: po.id,
        item_id: item.itemId,
        ordered_quantity: item.quantity,
        received_quantity: item.quantity, // Full receive
        unit: itemData.base_unit, // Assume input matches base unit for now
        unit_price: item.unitPrice,
        expiry_date: item.expiryDate
      })
      .select()
      .single();

    if (poItemError || !poItem) {
      console.error("Failed to insert PO Item:", poItemError);
      continue;
    }

    // B. Update Inventory & Record Transaction
    // This is now handled by the 'trg_purchase_receipt_inventory' trigger
    // when we insert into 'purchase_order_items'.

    // C. Create Inventory Lot (FIFO)
    // Generate a simple lot number: LOT-{YYYYMMDD}-{Random}
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    const lotNumber = `LOT-${dateStr}-${randomStr}`;

    await supabase.from("inventory_lots").insert({
      store_id: storeId,
      item_id: item.itemId,
      lot_number: lotNumber,
      quantity: item.quantity,
      remaining_quantity: item.quantity,
      unit: itemData.base_unit,
      received_date: new Date().toISOString(), // received today
      expiry_date: item.expiryDate || null,
      unit_cost: item.unitPrice,
      purchase_order_item_id: poItem.id
    });

    // E. Update Latest Purchase Price if changed
    if (item.unitPrice !== itemData.latest_purchase_price) {
      await supabase
        .from("items")
        .update({ latest_purchase_price: item.unitPrice })
        .eq("id", item.itemId);
    }
  }

  revalidatePath("/dashboard/inventory");
  return { success: true };
}

export async function updatePhysicalCount(
  itemId: string,
  physicalQuantity: number,
  reason: string,
  notes?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) return { error: "Store not found" };
  const storeId = userRole.store_id;

  try {
    // 1. Start Physical Count (Spot Check)
    const { data: countId, error: startError } = await supabase.rpc('start_physical_count', {
      p_store_id: storeId,
      p_count_date: new Date().toISOString(),
      p_zone: 'Quick Adjustment', // Default zone for quick adjustments
      p_user_id: user.id
    });

    if (startError) throw new Error(`Failed to start physical count: ${startError.message}`);

    // 2. Record Item Count
    // Fetch item unit first
    const { data: itemData } = await supabase
      .from("items")
      .select("base_unit")
      .eq("id", itemId)
      .single();

    const { error: recordError } = await supabase.rpc('record_count_item', {
      p_count_id: countId,
      p_item_id: itemId,
      p_counted_quantity: physicalQuantity,
      p_unit: itemData?.base_unit || "ea",
      p_notes: `${reason} ${notes ? `- ${notes}` : ""}`
    });

    if (recordError) throw new Error(`Failed to record item count: ${recordError.message}`);

    // 3. Complete Physical Count (This triggers inventory update & transaction logging)
    const { error: completeError } = await supabase.rpc('complete_physical_count', {
      p_count_id: countId
    });

    if (completeError) throw new Error(`Failed to complete physical count: ${completeError.message}`);

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating physical count:", error);
    return { error: error.message };
  }
}
