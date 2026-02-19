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
"[project]/src/app/dashboard/recipes/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"0067871440310bd5f6dfcc08c319de2d658e6f355b":"getRecipes","402d0609eb37447a75537aeca8f2fe0f2a3b08c2ff":"calculateRecipeCost","40e29492683456c20143c4d0a53e8d770bacec6584":"createRecipe"},"",""] */ __turbopack_context__.s([
    "calculateRecipeCost",
    ()=>calculateRecipeCost,
    "createRecipe",
    ()=>createRecipe,
    "getRecipes",
    ()=>getRecipes
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function createRecipe(data) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            error: "Unauthorized"
        };
    }
    const { data: userRole } = await supabase.from("user_roles").select("store_id").eq("user_id", user.id).single();
    if (!userRole?.store_id) {
        return {
            error: "Store not found"
        };
    }
    const store_id = userRole.store_id;
    const { outputItemId, outputQuantity, items, name, description } = data;
    // Validation: Circular Reference Check
    if (items.some((item)=>item.inputItemId === outputItemId)) {
        return {
            error: "Self-reference detected: Output item cannot be an ingredient."
        };
    }
    // 1. Calculate next version
    const { data: existingRecipes, error: versionError } = await supabase.from("recipes").select("version").eq("store_id", store_id).eq("output_item_id", outputItemId).order("version", {
        ascending: false
    }).limit(1);
    if (versionError) {
        return {
            error: `Version check failed: ${versionError.message}`
        };
    }
    const nextVersion = existingRecipes && existingRecipes.length > 0 ? existingRecipes[0].version + 1 : 1;
    // 2. Insert Recipe
    const { data: recipe, error: recipeError } = await supabase.from("recipes").insert({
        store_id,
        output_item_id: outputItemId,
        output_quantity: outputQuantity,
        version: nextVersion,
        is_active: true,
        name,
        description
    }).select().single();
    if (recipeError) {
        return {
            error: `Recipe creation failed: ${recipeError.message}`
        };
    }
    // 3. Insert Recipe Items
    if (items.length > 0) {
        const recipeItems = items.map((item, index)=>({
                recipe_id: recipe.id,
                input_item_id: item.inputItemId,
                quantity: item.quantity,
                unit: item.unit,
                sort_order: index
            }));
        const { error: itemsError } = await supabase.from("recipe_items").insert(recipeItems);
        if (itemsError) {
            // Rollback: delete the recipe if items fail
            await supabase.from("recipes").delete().eq("id", recipe.id);
            return {
                error: `Failed to add ingredients: ${itemsError.message}`
            };
        }
    }
    // 4. Deactivate previous versions
    const { error: deactivateError } = await supabase.from("recipes").update({
        is_active: false
    }).eq("store_id", store_id).eq("output_item_id", outputItemId).neq("id", recipe.id); // Exclude the new one
    if (deactivateError) {
        console.error("Failed to deactivate old recipes:", deactivateError);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard/recipes");
    return {
        success: true,
        recipeId: recipe.id
    };
}
async function calculateRecipeCost(items) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    let totalCost = 0;
    // Fetch prices for all items
    const itemIds = items.map((i)=>i.inputItemId);
    const { data: dbItems } = await supabase.from("items").select("id, base_unit, latest_purchase_price").in("id", itemIds);
    if (!dbItems) return 0;
    for (const item of items){
        const dbItem = dbItems.find((i)=>i.id === item.inputItemId);
        if (!dbItem || !dbItem.latest_purchase_price) continue;
        // Convert unit
        // We call the DB function for accurate conversion
        const { data: convertedQty } = await supabase.rpc("convert_unit", {
            p_quantity: item.quantity,
            p_from_unit: item.unit,
            p_to_unit: dbItem.base_unit,
            p_item_id: item.inputItemId
        });
        if (convertedQty !== null) {
            totalCost += convertedQty * dbItem.latest_purchase_price;
        }
    }
    return totalCost;
}
async function getRecipes() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createClient"])();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from("recipes").select(`
      *,
      output_item:items!output_item_id(name, code, base_unit),
      recipe_items(
        quantity,
        unit,
        input_item:items!input_item_id(name, base_unit, latest_purchase_price)
      )
    `).eq("is_active", true).order("created_at", {
        ascending: false
    });
    return data || [];
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    createRecipe,
    calculateRecipeCost,
    getRecipes
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createRecipe, "40e29492683456c20143c4d0a53e8d770bacec6584", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(calculateRecipeCost, "402d0609eb37447a75537aeca8f2fe0f2a3b08c2ff", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getRecipes, "0067871440310bd5f6dfcc08c319de2d658e6f355b", null);
}),
"[project]/.next-internal/server/app/dashboard/recipes/new/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/app/dashboard/recipes/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$recipes$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/recipes/actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
}),
"[project]/.next-internal/server/app/dashboard/recipes/new/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/app/dashboard/recipes/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "001aea836daf26be9195c23c5625652d6dbba4322f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getItems"],
    "402d0609eb37447a75537aeca8f2fe0f2a3b08c2ff",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$recipes$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["calculateRecipeCost"],
    "402f3cfe50d32bb556d90c95dc56e19679ab92f2c2",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteItem"],
    "40e29492683456c20143c4d0a53e8d770bacec6584",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$recipes$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createRecipe"],
    "40e564b33b2354f68726dd75c1c6eb83c39fdb0f17",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createItem"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$recipes$2f$new$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$src$2f$app$2f$dashboard$2f$recipes$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/recipes/new/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/app/dashboard/recipes/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$items$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/items/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$dashboard$2f$recipes$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/dashboard/recipes/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_8c6cd96a._.js.map