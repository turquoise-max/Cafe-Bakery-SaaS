"use server";

import { createClient } from "@/lib/supabase/server";
import { Item, ItemType, UnitType } from "@/types/inventory";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateItemInput = {
  name: string;
  code?: string;
  type: ItemType;
  base_unit: UnitType;
  safety_stock?: number;
  category_id?: string;
};

export async function getItems() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) {
    // redirect("/onboarding");
    return []; // Return empty items if no store
  }

  const { data, error } = await supabase
    .from("items")
    .select(`
      *,
      category:categories(name)
    `)
    .eq("store_id", userRole.store_id)
    .order("name");

  if (error) {
    console.error("Error fetching items:", error);
    throw new Error("Failed to fetch items");
  }

  return data as Item[];
}

export async function createItem(input: CreateItemInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get Store ID (Strict Check)
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) {
    return { error: "Store not found for user" };
  }

  const { data, error } = await supabase
    .from("items")
    .insert({
      store_id: userRole.store_id,
      name: input.name,
      code: input.code,
      type: input.type,
      base_unit: input.base_unit,
      safety_stock: input.safety_stock, // Supabase handles number -> decimal
      category_id: input.category_id,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating item:", error);
    return { error: `Failed to create item: ${error.message}` };
  }

  revalidatePath("/dashboard/items");
  return { success: true, item: data };
}

export async function deleteItem(itemId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get user's store for ownership check
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("store_id")
    .eq("user_id", user.id)
    .single();

  if (!userRole?.store_id) {
    return { error: "Store not found for user" };
  }

  // Delete only if item belongs to user's store
  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("store_id", userRole.store_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/items");
  return { success: true };
}