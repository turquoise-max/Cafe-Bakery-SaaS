"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface RecipeItemInput {
  inputItemId: string;
  quantity: number;
  unit: string;
}

interface CreateRecipeInput {
  outputItemId: string;
  outputQuantity: number;
  items: RecipeItemInput[];
  name?: string;
  description?: string;
}

export async function createRecipe(data: CreateRecipeInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) {
    return { error: "Store not found" };
  }

  const store_id = userRole.store_id;
  const { outputItemId, outputQuantity, items, name, description } = data;

  // Validation: Circular Reference Check
  if (items.some((item) => item.inputItemId === outputItemId)) {
    return { error: "Self-reference detected: Output item cannot be an ingredient." };
  }

  // 1. Calculate next version
  const { data: existingRecipes, error: versionError } = await supabase
    .from("recipes")
    .select("version")
    .eq("store_id", store_id)
    .eq("output_item_id", outputItemId)
    .order("version", { ascending: false })
    .limit(1);

  if (versionError) {
    return { error: `Version check failed: ${versionError.message}` };
  }

  const nextVersion = existingRecipes && existingRecipes.length > 0
    ? existingRecipes[0].version + 1
    : 1;

  // 2. Insert Recipe
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      store_id,
      output_item_id: outputItemId,
      output_quantity: outputQuantity,
      version: nextVersion,
      is_active: true,
      name,
      description,
    })
    .select()
    .single();

  if (recipeError) {
    return { error: `Recipe creation failed: ${recipeError.message}` };
  }

  // 3. Insert Recipe Items
  if (items.length > 0) {
    const recipeItems = items.map((item, index) => ({
      recipe_id: recipe.id,
      input_item_id: item.inputItemId,
      quantity: item.quantity,
      unit: item.unit,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("recipe_items")
      .insert(recipeItems);

    if (itemsError) {
      // Rollback: delete the recipe if items fail
      await supabase.from("recipes").delete().eq("id", recipe.id);
      return { error: `Failed to add ingredients: ${itemsError.message}` };
    }
  }

  // 4. Deactivate previous versions
  const { error: deactivateError } = await supabase
    .from("recipes")
    .update({ is_active: false })
    .eq("store_id", store_id)
    .eq("output_item_id", outputItemId)
    .neq("id", recipe.id); // Exclude the new one

  if (deactivateError) {
    console.error("Failed to deactivate old recipes:", deactivateError);
  }

  revalidatePath("/dashboard/recipes");
  return { success: true, recipeId: recipe.id };
}

export async function calculateRecipeCost(items: RecipeItemInput[]) {
  const supabase = await createClient();
  let totalCost = 0;

  // Fetch prices for all items
  const itemIds = items.map((i) => i.inputItemId);
  const { data: dbItems } = await supabase
    .from("items")
    .select("id, base_unit, latest_purchase_price")
    .in("id", itemIds);

  if (!dbItems) return 0;

  for (const item of items) {
    const dbItem = dbItems.find((i) => i.id === item.inputItemId);
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
      totalCost += (convertedQty as number) * dbItem.latest_purchase_price;
    }
  }

  return totalCost;
}

export async function getRecipes() {
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
    .from("recipes")
    .select(`
      *,
      output_item:items!output_item_id(name, code, base_unit),
      recipe_items(
        quantity,
        unit,
        input_item:items!input_item_id(name, base_unit, latest_purchase_price)
      )
    `)
    .eq("store_id", userRole.store_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return data || [];
}