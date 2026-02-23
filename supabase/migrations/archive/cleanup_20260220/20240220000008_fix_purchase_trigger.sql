-- ==========================================
-- Fix Purchase Receipt Trigger to handle INSERT and UPDATE correctly
-- ==========================================

CREATE OR REPLACE FUNCTION process_purchase_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id UUID;
  v_received_date DATE;
  v_quantity_diff DECIMAL;
  v_unit_price DECIMAL;
BEGIN
  -- Determine quantity to add
  IF TG_OP = 'INSERT' THEN
    v_quantity_diff := NEW.received_quantity;
  ELSIF TG_OP = 'UPDATE' THEN
    v_quantity_diff := NEW.received_quantity - OLD.received_quantity;
  END IF;

  -- If no change in quantity, exit
  IF v_quantity_diff = 0 THEN
    RETURN NEW;
  END IF;

  -- Get store_id and date from PO
  SELECT store_id, received_date INTO v_store_id, v_received_date
  FROM purchase_orders WHERE id = NEW.purchase_order_id;

  -- If received_date is null, use current date
  IF v_received_date IS NULL THEN
    v_received_date := CURRENT_DATE;
  END IF;
  
  -- Handle potential null unit_price
  v_unit_price := COALESCE(NEW.unit_price, 0);

  -- Update Inventory
  INSERT INTO inventory (store_id, item_id, theoretical_quantity)
  VALUES (v_store_id, NEW.item_id, v_quantity_diff)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET
    theoretical_quantity = inventory.theoretical_quantity + v_quantity_diff,
    last_updated_at = NOW();

  -- Record Transaction
  INSERT INTO inventory_transactions (
    store_id, item_id, transaction_type, quantity, unit, unit_cost, total_cost, reference_type, reference_id, transaction_date
  ) VALUES (
    v_store_id, NEW.item_id, 'purchase', v_quantity_diff, NEW.unit, v_unit_price, v_quantity_diff * v_unit_price, 'purchase_order', NEW.purchase_order_id, v_received_date
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_purchase_receipt_inventory ON purchase_order_items;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER trg_purchase_receipt_inventory
  AFTER INSERT OR UPDATE OF received_quantity ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION process_purchase_receipt();