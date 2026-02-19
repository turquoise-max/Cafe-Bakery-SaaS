'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface SaleItemInput {
  itemId: string
  quantity: number
}

export async function getSaleItems() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get user's store
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('store_id')
    .eq('user_id', user.id)
    .single()

  if (!userRole?.store_id) return []

  const { data, error } = await supabase
    .from('items')
    .select('id, name, sale_price, base_unit')
    .eq('store_id', userRole.store_id)
    .eq('type', 'finished') // Only finished goods can be sold
    .order('name')

  if (error) {
    console.error('Error fetching sale items:', error)
    return []
  }

  return data
}

export async function recordSale(storeId: string, items: SaleItemInput[]) {
  const supabase = await createClient()

  try {
    // 1. Create Sale Record
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        store_id: storeId,
        sale_date: new Date().toISOString().split('T')[0], // Today
        sale_time: new Date().toTimeString().split(' ')[0], // Current time
        channel: 'pos', // Default to POS for simulator
        total_amount: 0, // We don't calculate price in simulator for now
      })
      .select()
      .single()

    if (saleError) throw saleError

    // 2. Create Sale Items
    const saleItems = items.map((item) => ({
      sale_id: saleData.id,
      item_id: item.itemId,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from('sales_items')
      .insert(saleItems)

    if (itemsError) throw itemsError

    // 3. Process Inventory Deduction (Application Layer Logic instead of DB Trigger)
    // This replaces the trigger 'trg_sale_inventory_deduction' from migration 20240101000008
    await processSaleInventory(supabase, storeId, saleData.id, items)

    // 4. Revalidate Inventory Page to reflect changes
    revalidatePath('/dashboard/inventory')

    return { success: true, message: '판매가 성공적으로 기록되었습니다.' }
  } catch (error: any) {
    console.error('Error recording sale:', error)
    return { success: false, message: error.message || '판매 기록 중 오류가 발생했습니다.' }
  }
}

// Helper to process inventory deduction (Simulates the DB Trigger logic)
async function processSaleInventory(supabase: any, storeId: string, saleId: string, items: SaleItemInput[]) {
  for (const item of items) {
    // Get the product name for logging
    const { data: product } = await supabase
      .from('items')
      .select('name')
      .eq('id', item.itemId)
      .single()
    
    const productName = product?.name || 'Unknown Product'

    // A. Check for Recipe (BOM)
    // We look for an active recipe for this output item
    const { data: recipe } = await supabase
      .from('recipes')
      .select('id, output_quantity')
      .eq('output_item_id', item.itemId)
      .eq('is_active', true)
      .maybeSingle() // Use maybeSingle to avoid error if no recipe

    if (recipe) {
      // Has Recipe: Deduct Ingredients
      const { data: ingredients } = await supabase
        .from('recipe_items')
        .select('input_item_id, quantity, unit')
        .eq('recipe_id', recipe.id)

      if (ingredients && ingredients.length > 0) {
        for (const ing of ingredients) {
          // Calculate required quantity: (Ingredient Qty * Sold Qty) / Recipe Output Qty
          // Example: Recipe makes 1 Cake using 500g Flour. Sold 2 Cakes. Need (500 * 2) / 1 = 1000g Flour.
          const deductionQty = (ing.quantity * item.quantity) / recipe.output_quantity

          // Update Inventory for the ingredient
          await updateInventory(
            supabase, 
            storeId, 
            ing.input_item_id, 
            deductionQty, 
            ing.unit, 
            saleId, 
            'sale',
            `Sale of ${productName} (Qty: ${item.quantity}) - Ingredient Deduction`
          )
        }
      }
    } else {
      // No Recipe: Deduct Item Itself (e.g. bottled drink, or simple item)
      // Check if it's inventory managed
      const { data: itemInfo } = await supabase
        .from('items')
        .select('is_inventory_managed, base_unit')
        .eq('id', item.itemId)
        .single()
      
      if (itemInfo && itemInfo.is_inventory_managed) {
        await updateInventory(
          supabase, 
          storeId, 
          item.itemId, 
          item.quantity, 
          itemInfo.base_unit, 
          saleId, 
          'sale',
          `Sale of ${productName} (Qty: ${item.quantity}) - Direct Deduction`
        )
      }
    }
  }
}

// Helper to update inventory and record transaction
async function updateInventory(
  supabase: any, 
  storeId: string, 
  itemId: string, 
  quantity: number, 
  unit: string, 
  referenceId: string,
  type: 'sale' | 'purchase' | 'adjustment' | 'waste' | 'production' | 'transfer',
  notes: string
) {
  // 1. Update Inventory Table
  // We need to fetch current quantity first to update it
  const { data: inventory } = await supabase
    .from('inventory')
    .select('id, theoretical_quantity')
    .eq('store_id', storeId)
    .eq('item_id', itemId)
    .maybeSingle()

  if (inventory) {
    const newQty = inventory.theoretical_quantity - quantity // Decrement
    
    await supabase
      .from('inventory')
      .update({ 
        theoretical_quantity: newQty,
        last_updated_at: new Date().toISOString() 
      })
      .eq('id', inventory.id)
  } else {
    // Create new inventory record if not exists (starts at negative quantity)
    // This happens if we sell something we haven't officially "stocked" yet
    await supabase
      .from('inventory')
      .insert({
        store_id: storeId,
        item_id: itemId,
        theoretical_quantity: -quantity,
        physical_quantity: 0
      })
  }

  // 2. Insert Transaction Record
  await supabase
    .from('inventory_transactions')
    .insert({
      store_id: storeId,
      item_id: itemId,
      transaction_type: type,
      quantity: -quantity, // Negative for deduction
      unit: unit,
      reference_type: 'sale',
      reference_id: referenceId,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: notes
    })
}