-- Enable RLS for Business Tables
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_count_items ENABLE ROW LEVEL SECURITY;

-- Helper function to check store access
CREATE OR REPLACE FUNCTION public.has_store_access(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND store_id = target_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Items Policies
CREATE POLICY "Users can view items in their stores"
ON items FOR SELECT
USING (has_store_access(store_id));

CREATE POLICY "Users can insert items in their stores"
ON items FOR INSERT
WITH CHECK (has_store_access(store_id));

CREATE POLICY "Users can update items in their stores"
ON items FOR UPDATE
USING (has_store_access(store_id));

CREATE POLICY "Users can delete items in their stores"
ON items FOR DELETE
USING (has_store_access(store_id));

-- 2. Recipes Policies
CREATE POLICY "Users can view recipes in their stores"
ON recipes FOR SELECT
USING (has_store_access(store_id));

CREATE POLICY "Users can insert recipes in their stores"
ON recipes FOR INSERT
WITH CHECK (has_store_access(store_id));

CREATE POLICY "Users can update recipes in their stores"
ON recipes FOR UPDATE
USING (has_store_access(store_id));

CREATE POLICY "Users can delete recipes in their stores"
ON recipes FOR DELETE
USING (has_store_access(store_id));

-- 3. Recipe Items Policies (Indirectly via recipe -> store_id)
-- Note: recipe_items table doesn't have store_id directly, but linked via recipe_id
CREATE POLICY "Users can view recipe items via recipe"
ON recipe_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_items.recipe_id
      AND has_store_access(recipes.store_id)
  )
);

CREATE POLICY "Users can manage recipe items via recipe"
ON recipe_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_items.recipe_id
      AND has_store_access(recipes.store_id)
  )
);

-- 4. Inventory Policies
CREATE POLICY "Users can view inventory in their stores"
ON inventory FOR SELECT
USING (has_store_access(store_id));

CREATE POLICY "Users can update inventory in their stores"
ON inventory FOR UPDATE
USING (has_store_access(store_id));

-- 5. Inventory Transactions Policies
CREATE POLICY "Users can view inventory transactions in their stores"
ON inventory_transactions FOR SELECT
USING (has_store_access(store_id));

CREATE POLICY "Users can insert inventory transactions in their stores"
ON inventory_transactions FOR INSERT
WITH CHECK (has_store_access(store_id));

-- 6. Sales Policies
CREATE POLICY "Users can view sales in their stores"
ON sales FOR SELECT
USING (has_store_access(store_id));

CREATE POLICY "Users can insert sales in their stores"
ON sales FOR INSERT
WITH CHECK (has_store_access(store_id));

-- 7. Sales Items Policies (Indirectly via sales -> store_id)
CREATE POLICY "Users can view sales items via sales"
ON sales_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sales_items.sale_id
      AND has_store_access(sales.store_id)
  )
);

CREATE POLICY "Users can insert sales items via sales"
ON sales_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales
    WHERE sales.id = sales_items.sale_id
      AND has_store_access(sales.store_id)
  )
);

-- 8. Suppliers Policies
CREATE POLICY "Users can view suppliers in their stores"
ON suppliers FOR SELECT
USING (has_store_access(store_id));

CREATE POLICY "Users can manage suppliers in their stores"
ON suppliers FOR ALL
USING (has_store_access(store_id));

-- 9. Purchase Orders Policies
CREATE POLICY "Users can view purchase orders in their stores"
ON purchase_orders FOR SELECT
USING (has_store_access(store_id));

CREATE POLICY "Users can manage purchase orders in their stores"
ON purchase_orders FOR ALL
USING (has_store_access(store_id));

-- 10. Purchase Order Items Policies (Indirectly via PO)
CREATE POLICY "Users can view po items via po"
ON purchase_order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders
    WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND has_store_access(purchase_orders.store_id)
  )
);

CREATE POLICY "Users can manage po items via po"
ON purchase_order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders
    WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND has_store_access(purchase_orders.store_id)
  )
);

-- 11. Physical Counts Policies
CREATE POLICY "Users can view physical counts in their stores"
ON physical_counts FOR SELECT
USING (has_store_access(store_id));

CREATE POLICY "Users can manage physical counts in their stores"
ON physical_counts FOR ALL
USING (has_store_access(store_id));

-- 12. Physical Count Items Policies (Indirectly via PC)
CREATE POLICY "Users can view pc items via pc"
ON physical_count_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM physical_counts
    WHERE physical_counts.id = physical_count_items.physical_count_id
      AND has_store_access(physical_counts.store_id)
  )
);

CREATE POLICY "Users can manage pc items via pc"
ON physical_count_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM physical_counts
    WHERE physical_counts.id = physical_count_items.physical_count_id
      AND has_store_access(physical_counts.store_id)
  )
);