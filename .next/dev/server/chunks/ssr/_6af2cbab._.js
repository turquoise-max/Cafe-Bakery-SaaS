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

/* __next_internal_action_entry_do_not_use__ [{"00242ed99168f557f2d608515fd4bc4d8d5a963d36":"getInventory","009f2ebd9f5e18aad71d29da313f09fed9ae95f989":"getSuppliers","600976a9b4d8df6da1d5db027a73855bb18c382110":"processInbound"},"",""] */ __turbopack_context__.s([
    "getInventory",
    ()=>getInventory,
    "getSuppliers",
    ()=>getSuppliers,
    "processInbound",
    ()=>processInbound
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function getInventory() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) throw new Error("Store not found");
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
    // 2. Insert Items
    // Note: The DB trigger 'trg_purchase_receipt_inventory' listens to UPDATE of received_quantity.
    // To trigger it, we might need to Insert 0 then Update? 
    // OR we can manually update inventory here.
    // Given we control the Action, Manual Update + Transaction Log is more explicit and robust for "Direct Inbound" feature.
    // The Trigger is good for "PO Workflow" (Order -> Wait -> Receive).
    // Let's do manual update to ensure 'latest_purchase_price' update logic is handled.
    for (const item of items){
        // A. Insert PO Item
        // We fetch item unit first
        const { data: itemData } = await supabase.from("items").select("base_unit, latest_purchase_price").eq("id", item.itemId).single();
        if (!itemData) continue;
        await supabase.from("purchase_order_items").insert({
            purchase_order_id: po.id,
            item_id: item.itemId,
            ordered_quantity: item.quantity,
            received_quantity: item.quantity,
            unit: itemData.base_unit,
            unit_price: item.unitPrice,
            expiry_date: item.expiryDate
        });
        // B. Update Inventory (Increment)
        // We use the 'deduct_inventory_smart' logic reversed? No, simple increment.
        // But we should use a DB function if possible to ensure consistency.
        // Let's manually update for now as we don't have 'add_inventory' function.
        // Check if inventory record exists
        const { data: inv } = await supabase.from("inventory").select("id, theoretical_quantity").eq("store_id", storeId).eq("item_id", item.itemId).single();
        if (inv) {
            await supabase.from("inventory").update({
                theoretical_quantity: inv.theoretical_quantity + item.quantity,
                last_updated_at: new Date().toISOString()
            }).eq("id", inv.id);
        } else {
            await supabase.from("inventory").insert({
                store_id: storeId,
                item_id: item.itemId,
                theoretical_quantity: item.quantity
            });
        }
        // C. Record Transaction
        await supabase.from("inventory_transactions").insert({
            store_id: storeId,
            item_id: item.itemId,
            transaction_type: "purchase",
            quantity: item.quantity,
            unit: itemData.base_unit,
            unit_cost: item.unitPrice,
            total_cost: item.quantity * item.unitPrice,
            reference_type: "purchase_order",
            reference_id: po.id,
            transaction_date: new Date().toISOString(),
            created_by: user.id
        });
        // D. Update Latest Purchase Price if changed
        if (item.unitPrice !== itemData.latest_purchase_price) {
            // Logic: Always update to latest? Or ask user? 
            // Requirement says "consider logic". For MVP "Direct Inbound", updating is standard.
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
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    getInventory,
    getSuppliers,
    processInbound
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getInventory, "00242ed99168f557f2d608515fd4bc4d8d5a963d36", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getSuppliers, "009f2ebd9f5e18aad71d29da313f09fed9ae95f989", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(processInbound, "600976a9b4d8df6da1d5db027a73855bb18c382110", null);
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
    // RLS will filter by store_id, but we need to ensure user has a role
    // Actually RLS policy uses `auth.uid()`, so we just need to be authenticated.
    // But strictly, we should check if they are attached to a store.
    // The 'sync_user_role_to_metadata' trigger optimization would allow us to use metadata.
    // For now, let's trust RLS but handle error if query returns nothing due to policy.
    const { data, error } = await supabase.from("items").select(`
      *,
      category:categories(name)
    `).order("name");
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
    const { error } = await supabase.from("items").delete().eq("id", itemId);
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
"[project]/.next-internal/server/app/dashboard/inventory/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
}),
"[project]/.next-internal/server/app/dashboard/inventory/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "001aea836daf26be9195c23c5625652d6dbba4322f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getItems"],
    "00242ed99168f557f2d608515fd4bc4d8d5a963d36",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getInventory"],
    "009f2ebd9f5e18aad71d29da313f09fed9ae95f989",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSuppliers"],
    "402f3cfe50d32bb556d90c95dc56e19679ab92f2c2",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteItem"],
    "40e564b33b2354f68726dd75c1c6eb83c39fdb0f17",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createItem"],
    "600976a9b4d8df6da1d5db027a73855bb18c382110",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["processInbound"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$inventory$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/inventory/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$inventory$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/inventory/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_6af2cbab._.js.map