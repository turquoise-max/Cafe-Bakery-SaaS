module.exports = [
"[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://mbvwsrwywzfmkvwcmhmh.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1idndzcnd5d3pmbWt2d2NtaG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NjIyOTQsImV4cCI6MjA4NjQzODI5NH0.1kYGW2HH-S59XZCt9Fn73EN20DM7oxwyddZ-cw0Yi5I"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
                }
            }
        }
    });
}
}),
"[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00242ed99168f557f2d608515fd4bc4d8d5a963d36":"getInventory","009f2ebd9f5e18aad71d29da313f09fed9ae95f989":"getSuppliers","00bb8966836fbbee06790a23414d97dde961210d3d":"getInventoryDashboardData","600976a9b4d8df6da1d5db027a73855bb18c382110":"processInbound","7875fdec04f22c52a785766e014bee004ad149675d":"updatePhysicalCount"},"",""] */ __turbopack_context__.s([
    "getInventory",
    ()=>getInventory,
    "getInventoryDashboardData",
    ()=>getInventoryDashboardData,
    "getSuppliers",
    ()=>getSuppliers,
    "processInbound",
    ()=>processInbound,
    "updatePhysicalCount",
    ()=>updatePhysicalCount
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function getInventoryDashboardData() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) {
        // redirect("/onboarding");
        return []; // Return empty data instead of redirecting
    }
    const { data, error } = await supabase.from("inventory").select(`
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
    `).eq("store_id", userRole.store_id).order("variance", {
        ascending: true
    });
    if (error) {
        console.error("Error fetching inventory:", error);
        throw new Error("Failed to fetch inventory");
    }
    // Transform data to include low stock logic
    const dashboardData = data.map((row)=>{
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
async function getInventory() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) {
        // redirect("/onboarding");
        return []; // Return empty data instead of redirecting
    }
    const { data, error } = await supabase.from("inventory").select(`
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
    `).eq("store_id", userRole.store_id).order("variance", {
        ascending: true
    });
    if (error) {
        console.error("Error fetching inventory:", error);
        throw new Error("Failed to fetch inventory");
    }
    return data;
}
async function getSuppliers() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) return [];
    const { data } = await supabase.from("suppliers").select("*").eq("store_id", userRole.store_id).eq("is_active", true).order("name");
    return data || [];
}
async function processInbound(supplierId, items) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {
        error: "Unauthorized"
    };
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) return {
        error: "Store not found"
    };
    const storeId = userRole.store_id;
    // 1. Create Purchase Order (Draft -> Received)
    // For Direct Inbound, we assume it's received immediately.
    const { data: po, error: poError } = await supabase.from("purchase_orders").insert({
        store_id: storeId,
        supplier_id: supplierId,
        status: "received",
        order_date: new Date().toISOString(),
        received_date: new Date().toISOString(),
        created_by: user.id,
        total_amount: items.reduce((sum, item)=>sum + item.quantity * item.unitPrice, 0)
    }).select().single();
    if (poError) return {
        error: `Failed to create PO: ${poError.message}`
    };
    for (const item of items){
        // A. Insert PO Item
        // We fetch item unit first
        const { data: itemData } = await supabase.from("items").select("base_unit, latest_purchase_price").eq("id", item.itemId).single();
        if (!itemData) continue;
        const { data: poItem, error: poItemError } = await supabase.from("purchase_order_items").insert({
            purchase_order_id: po.id,
            item_id: item.itemId,
            ordered_quantity: item.quantity,
            received_quantity: item.quantity,
            unit: itemData.base_unit,
            unit_price: item.unitPrice,
            expiry_date: item.expiryDate
        }).select().single();
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
            received_date: new Date().toISOString(),
            expiry_date: item.expiryDate || null,
            unit_cost: item.unitPrice,
            purchase_order_item_id: poItem.id
        });
        // E. Update Latest Purchase Price if changed
        if (item.unitPrice !== itemData.latest_purchase_price) {
            await supabase.from("items").update({
                latest_purchase_price: item.unitPrice
            }).eq("id", item.itemId);
        }
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/inventory");
    return {
        success: true
    };
}
async function updatePhysicalCount(itemId, physicalQuantity, reason, notes) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {
        error: "Unauthorized"
    };
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) return {
        error: "Store not found"
    };
    const storeId = userRole.store_id;
    try {
        // 1. Start Physical Count (Spot Check)
        const { data: countId, error: startError } = await supabase.rpc('start_physical_count', {
            p_store_id: storeId,
            p_count_date: new Date().toISOString(),
            p_zone: 'Quick Adjustment',
            p_user_id: user.id
        });
        if (startError) throw new Error(`Failed to start physical count: ${startError.message}`);
        // 2. Record Item Count
        // Fetch item unit first
        const { data: itemData } = await supabase.from("items").select("base_unit").eq("id", itemId).single();
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
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/inventory");
        return {
            success: true
        };
    } catch (error) {
        console.error("Error updating physical count:", error);
        return {
            error: error.message
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getInventoryDashboardData,
    getInventory,
    getSuppliers,
    processInbound,
    updatePhysicalCount
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getInventoryDashboardData, "00bb8966836fbbee06790a23414d97dde961210d3d", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getInventory, "00242ed99168f557f2d608515fd4bc4d8d5a963d36", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getSuppliers, "009f2ebd9f5e18aad71d29da313f09fed9ae95f989", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(processInbound, "600976a9b4d8df6da1d5db027a73855bb18c382110", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updatePhysicalCount, "7875fdec04f22c52a785766e014bee004ad149675d", null);
}),
"[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"001aea836daf26be9195c23c5625652d6dbba4322f":"getItems","402f3cfe50d32bb556d90c95dc56e19679ab92f2c2":"deleteItem","40e564b33b2354f68726dd75c1c6eb83c39fdb0f17":"createItem"},"",""] */ __turbopack_context__.s([
    "createItem",
    ()=>createItem,
    "deleteItem",
    ()=>deleteItem,
    "getItems",
    ()=>getItems
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function getItems() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) {
        // redirect("/onboarding");
        return []; // Return empty items if no store
    }
    const { data, error } = await supabase.from("items").select(`
      *,
      category:categories(name)
    `).eq("store_id", userRole.store_id).order("name");
    if (error) {
        console.error("Error fetching items:", error);
        throw new Error("Failed to fetch items");
    }
    return data;
}
async function createItem(input) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: "Unauthorized"
        };
    }
    // Get Store ID (Strict Check)
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) {
        return {
            error: "Store not found for user"
        };
    }
    const { data, error } = await supabase.from("items").insert({
        store_id: userRole.store_id,
        name: input.name,
        code: input.code,
        type: input.type,
        base_unit: input.base_unit,
        safety_stock: input.safety_stock,
        category_id: input.category_id,
        is_active: true
    }).select().single();
    if (error) {
        console.error("Error creating item:", error);
        return {
            error: `Failed to create item: ${error.message}`
        };
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/items");
    return {
        success: true,
        item: data
    };
}
async function deleteItem(itemId) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: "Unauthorized"
        };
    }
    // Get user's store for ownership check
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) {
        return {
            error: "Store not found for user"
        };
    }
    // Delete only if item belongs to user's store
    const { error } = await supabase.from("items").delete().eq("id", itemId).eq("store_id", userRole.store_id);
    if (error) {
        return {
            error: error.message
        };
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/items");
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getItems,
    createItem,
    deleteItem
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getItems, "001aea836daf26be9195c23c5625652d6dbba4322f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createItem, "40e564b33b2354f68726dd75c1c6eb83c39fdb0f17", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteItem, "402f3cfe50d32bb556d90c95dc56e19679ab92f2c2", null);
}),
"[project]/src/app/dashboard/inventory/sales-actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"004579005769e38fabb568dcfde8edc6bf2ce8583b":"getSaleItems","60007e8c3887fc2cf8c927f297d6e6d8c61297d8c0":"recordSale"},"",""] */ __turbopack_context__.s([
    "getSaleItems",
    ()=>getSaleItems,
    "recordSale",
    ()=>recordSale
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function getSaleItems() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    // Get user's store
    const { data: userRole } = await supabase.from('user_roles').select('store_id').eq('user_id', user.id).single();
    if (!userRole?.store_id) return [];
    const { data, error } = await supabase.from('items').select('id, name, sale_price, base_unit').eq('store_id', userRole.store_id).eq('type', 'finished') // Only finished goods can be sold
    .order('name');
    if (error) {
        console.error('Error fetching sale items:', error);
        return [];
    }
    return data;
}
async function recordSale(storeId, items) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    try {
        // 1. Create Sale Record
        const { data: saleData, error: saleError } = await supabase.from('sales').insert({
            store_id: storeId,
            sale_date: new Date().toISOString().split('T')[0],
            sale_time: new Date().toTimeString().split(' ')[0],
            channel: 'pos',
            total_amount: 0
        }).select().single();
        if (saleError) throw saleError;
        // 2. Create Sale Items
        const saleItems = items.map((item)=>({
                sale_id: saleData.id,
                item_id: item.itemId,
                quantity: item.quantity
            }));
        const { error: itemsError } = await supabase.from('sales_items').insert(saleItems);
        if (itemsError) throw itemsError;
        // 3. Process Inventory Deduction (Application Layer Logic instead of DB Trigger)
        // This replaces the trigger 'trg_sale_inventory_deduction' from migration 20240101000008
        await processSaleInventory(supabase, storeId, saleData.id, items);
        // 4. Revalidate Inventory Page to reflect changes
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/inventory');
        return {
            success: true,
            message: '판매가 성공적으로 기록되었습니다.'
        };
    } catch (error) {
        console.error('Error recording sale:', error);
        return {
            success: false,
            message: error.message || '판매 기록 중 오류가 발생했습니다.'
        };
    }
}
// Helper to process inventory deduction (Simulates the DB Trigger logic)
async function processSaleInventory(supabase, storeId, saleId, items) {
    for (const item of items){
        // Get the product name for logging
        const { data: product } = await supabase.from('items').select('name').eq('id', item.itemId).single();
        const productName = product?.name || 'Unknown Product';
        // A. Check for Recipe (BOM)
        // We look for an active recipe for this output item
        const { data: recipe } = await supabase.from('recipes').select('id, output_quantity').eq('output_item_id', item.itemId).eq('is_active', true).maybeSingle() // Use maybeSingle to avoid error if no recipe
        ;
        if (recipe) {
            // Has Recipe: Deduct Ingredients
            const { data: ingredients } = await supabase.from('recipe_items').select('input_item_id, quantity, unit').eq('recipe_id', recipe.id);
            if (ingredients && ingredients.length > 0) {
                for (const ing of ingredients){
                    // Calculate required quantity: (Ingredient Qty * Sold Qty) / Recipe Output Qty
                    // Example: Recipe makes 1 Cake using 500g Flour. Sold 2 Cakes. Need (500 * 2) / 1 = 1000g Flour.
                    const deductionQty = ing.quantity * item.quantity / recipe.output_quantity;
                    // Update Inventory for the ingredient
                    await updateInventory(supabase, storeId, ing.input_item_id, deductionQty, ing.unit, saleId, 'sale', `Sale of ${productName} (Qty: ${item.quantity}) - Ingredient Deduction`);
                }
            }
        } else {
            // No Recipe: Deduct Item Itself (e.g. bottled drink, or simple item)
            // Check if it's inventory managed
            const { data: itemInfo } = await supabase.from('items').select('is_inventory_managed, base_unit').eq('id', item.itemId).single();
            if (itemInfo && itemInfo.is_inventory_managed) {
                await updateInventory(supabase, storeId, item.itemId, item.quantity, itemInfo.base_unit, saleId, 'sale', `Sale of ${productName} (Qty: ${item.quantity}) - Direct Deduction`);
            }
        }
    }
}
// Helper to update inventory and record transaction
async function updateInventory(supabase, storeId, itemId, quantity, unit, referenceId, type, notes) {
    // 1. Update Inventory Table
    // We need to fetch current quantity first to update it
    const { data: inventory } = await supabase.from('inventory').select('id, theoretical_quantity').eq('store_id', storeId).eq('item_id', itemId).maybeSingle();
    if (inventory) {
        const newQty = inventory.theoretical_quantity - quantity // Decrement
        ;
        await supabase.from('inventory').update({
            theoretical_quantity: newQty,
            last_updated_at: new Date().toISOString()
        }).eq('id', inventory.id);
    } else {
        // Create new inventory record if not exists (starts at negative quantity)
        // This happens if we sell something we haven't officially "stocked" yet
        await supabase.from('inventory').insert({
            store_id: storeId,
            item_id: itemId,
            theoretical_quantity: -quantity,
            physical_quantity: 0
        });
    }
    // 2. Insert Transaction Record
    await supabase.from('inventory_transactions').insert({
        store_id: storeId,
        item_id: itemId,
        transaction_type: type,
        quantity: -quantity,
        unit: unit,
        reference_type: 'sale',
        reference_id: referenceId,
        transaction_date: new Date().toISOString().split('T')[0],
        notes: notes
    });
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getSaleItems,
    recordSale
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getSaleItems, "004579005769e38fabb568dcfde8edc6bf2ce8583b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(recordSale, "60007e8c3887fc2cf8c927f297d6e6d8c61297d8c0", null);
}),
"[project]/src/app/dashboard/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"0097669927c60a7edeecc70492b7110827b5049dc3":"getUserStore"},"",""] */ __turbopack_context__.s([
    "getUserStore",
    ()=>getUserStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function getUserStore() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/login');
    }
    // Get the store associated with the user
    // For MVP, we assume a user has one store or we pick the first one
    const { data: userRole } = await supabase.from('user_roles').select(`
      store_id,
      stores (
        id,
        name,
        code
      )
    `).eq('user_id', user.id).single();
    if (!userRole || !userRole.store_id || !userRole.stores) {
        // If no store found, they might need to onboard
        // But dashboard layout should handle this redirection usually.
        return null;
    }
    // Supabase returns related data as an object if it's a one-to-one or many-to-one relationship
    // However, without generated types, TS might treat it as an array.
    // We cast it to any to bypass the error for now, assuming the relationship is correct.
    const store = userRole.stores;
    return {
        id: userRole.store_id,
        name: store.name,
        code: store.code
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getUserStore
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getUserStore, "0097669927c60a7edeecc70492b7110827b5049dc3", null);
}),
"[project]/.next-internal/server/app/dashboard/inventory/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE2 => \"[project]/src/app/dashboard/inventory/sales-actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE3 => \"[project]/src/app/dashboard/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$sales$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/inventory/sales-actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
}),
"[project]/.next-internal/server/app/dashboard/inventory/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE2 => \"[project]/src/app/dashboard/inventory/sales-actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE3 => \"[project]/src/app/dashboard/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "001aea836daf26be9195c23c5625652d6dbba4322f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getItems"],
    "00242ed99168f557f2d608515fd4bc4d8d5a963d36",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getInventory"],
    "004579005769e38fabb568dcfde8edc6bf2ce8583b",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$sales$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSaleItems"],
    "0097669927c60a7edeecc70492b7110827b5049dc3",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getUserStore"],
    "009f2ebd9f5e18aad71d29da313f09fed9ae95f989",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSuppliers"],
    "00bb8966836fbbee06790a23414d97dde961210d3d",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getInventoryDashboardData"],
    "402f3cfe50d32bb556d90c95dc56e19679ab92f2c2",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteItem"],
    "40e564b33b2354f68726dd75c1c6eb83c39fdb0f17",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createItem"],
    "60007e8c3887fc2cf8c927f297d6e6d8c61297d8c0",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$sales$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["recordSale"],
    "600976a9b4d8df6da1d5db027a73855bb18c382110",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["processInbound"],
    "7875fdec04f22c52a785766e014bee004ad149675d",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updatePhysicalCount"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$inventory$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE2__$3d3e$__$225b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$sales$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE3__$3d3e$__$225b$project$5d2f$src$2f$app$2f$dashboard$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/inventory/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)", ACTIONS_MODULE2 => "[project]/src/app/dashboard/inventory/sales-actions.ts [app-rsc] (ecmascript)", ACTIONS_MODULE3 => "[project]/src/app/dashboard/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$sales$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/inventory/sales-actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_8496357f._.js.map