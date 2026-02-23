-- ==========================================
-- Update Inventory Triggers to be SECURITY DEFINER
-- ==========================================

-- 1. Sales Trigger: Deduct Inventory
CREATE OR REPLACE FUNCTION process_sale_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_material RECORD;
  v_store_id UUID;
  v_sale_date DATE;
BEGIN
  SELECT store_id, sale_date INTO v_store_id, v_sale_date
  FROM sales WHERE id = NEW.sale_id;

  -- 1. Deduct based on BOM
  FOR v_material IN
    SELECT material_id, total_quantity, unit
    FROM mv_flattened_bom
    WHERE product_id = NEW.item_id
  LOOP
    UPDATE inventory
    SET theoretical_quantity = theoretical_quantity - (v_material.total_quantity * NEW.quantity),
        last_updated_at = NOW()
    WHERE store_id = v_store_id AND item_id = v_material.material_id;

    -- Record transaction
    INSERT INTO inventory_transactions (
      store_id, item_id, transaction_type, quantity, unit, reference_type, reference_id, transaction_date
    ) VALUES (
      v_store_id, v_material.material_id, 'sale', -(v_material.total_quantity * NEW.quantity), v_material.unit, 'sale_item', NEW.id, v_sale_date
    );
  END LOOP;

  -- 2. Deduct direct item if no BOM (e.g., selling a raw material directly or simple product)
  IF NOT EXISTS (SELECT 1 FROM mv_flattened_bom WHERE product_id = NEW.item_id) THEN
     -- Check if the item itself is inventory managed. If so, deduct it directly.
     -- This handles cases where we sell an item that doesn't have a recipe (e.g. simple retail item)
     UPDATE inventory
     SET theoretical_quantity = theoretical_quantity - NEW.quantity,
         last_updated_at = NOW()
     WHERE store_id = v_store_id AND item_id = NEW.item_id;

     -- If update happened (meaning inventory record exists), record transaction
     IF FOUND THEN
       INSERT INTO inventory_transactions (
        store_id, item_id, transaction_type, quantity, unit, reference_type, reference_id, transaction_date
       )
       SELECT
        v_store_id, NEW.item_id, 'sale', -NEW.quantity, items.base_unit, 'sale_item', NEW.id, v_sale_date
       FROM items WHERE id = NEW.item_id;
     END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Purchase Trigger: Add Inventory
CREATE OR REPLACE FUNCTION process_purchase_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id UUID;
  v_received_date DATE;
BEGIN
  SELECT store_id, received_date INTO v_store_id, v_received_date
  FROM purchase_orders WHERE id = NEW.purchase_order_id;

  -- If received_date is null, use current date
  IF v_received_date IS NULL THEN
    v_received_date := CURRENT_DATE;
  END IF;

  -- Update Inventory
  INSERT INTO inventory (store_id, item_id, theoretical_quantity)
  VALUES (v_store_id, NEW.item_id, NEW.received_quantity)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET
    theoretical_quantity = inventory.theoretical_quantity + NEW.received_quantity,
    last_updated_at = NOW();

  -- Record Transaction
  INSERT INTO inventory_transactions (
    store_id, item_id, transaction_type, quantity, unit, unit_cost, total_cost, reference_type, reference_id, transaction_date
  ) VALUES (
    v_store_id, NEW.item_id, 'purchase', NEW.received_quantity, NEW.unit, NEW.unit_price, NEW.received_quantity * NEW.unit_price, 'purchase_order', NEW.purchase_order_id, v_received_date
  );

  RETURN NEW;
END;
$$;