-- Function to process inventory deduction on sale
CREATE OR REPLACE FUNCTION process_sale_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_material RECORD;
  v_store_id UUID;
  v_sale_date DATE;
  v_product_name VARCHAR;
BEGIN
  -- 1. Get Sale Info
  SELECT store_id, sale_date INTO v_store_id, v_sale_date
  FROM sales WHERE id = NEW.sale_id;

  -- Get Product Name for logging
  SELECT name INTO v_product_name FROM items WHERE id = NEW.item_id;

  -- 2. Deduct Inventory based on BOM (Recipe)
  -- Loop through all raw materials required for this product
  FOR v_material IN
    SELECT
      m.material_id,
      m.total_quantity,
      m.unit
    FROM mv_flattened_bom m
    WHERE m.product_id = NEW.item_id
  LOOP
    -- Update Inventory (Allow negative inventory)
    UPDATE inventory
    SET
      theoretical_quantity = theoretical_quantity - (v_material.total_quantity * NEW.quantity),
      last_updated_at = NOW()
    WHERE store_id = v_store_id
      AND item_id = v_material.material_id;

    -- If no inventory record exists, create one with negative quantity
    IF NOT FOUND THEN
      INSERT INTO inventory (store_id, item_id, theoretical_quantity)
      VALUES (
        v_store_id,
        v_material.material_id,
        -(v_material.total_quantity * NEW.quantity)
      );
    END IF;

    -- Log Transaction
    INSERT INTO inventory_transactions (
      store_id,
      item_id,
      transaction_type,
      quantity,
      unit,
      reference_type,
      reference_id,
      transaction_date,
      notes
    ) VALUES (
      v_store_id,
      v_material.material_id,
      'sale',
      -(v_material.total_quantity * NEW.quantity),
      v_material.unit,
      'sale_item',
      NEW.id,
      v_sale_date,
      'Sale of ' || v_product_name || ' (Qty: ' || NEW.quantity || ')'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger
DROP TRIGGER IF EXISTS trg_sale_inventory_deduction ON sales_items;
CREATE TRIGGER trg_sale_inventory_deduction
  AFTER INSERT ON sales_items
  FOR EACH ROW
  EXECUTE FUNCTION process_sale_inventory();