-- 1. Unit Conversion Function
CREATE OR REPLACE FUNCTION convert_unit(
  p_quantity DECIMAL,
  p_from_unit unit_type,
  p_to_unit unit_type,
  p_item_id UUID DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
  v_factor DECIMAL;
BEGIN
  IF p_from_unit = p_to_unit THEN
    RETURN p_quantity;
  END IF;

  SELECT conversion_factor INTO v_factor
  FROM unit_conversions
  WHERE from_unit = p_from_unit
    AND to_unit = p_to_unit
    AND (item_id = p_item_id OR item_id IS NULL)
  ORDER BY item_id DESC NULLS LAST
  LIMIT 1;

  IF v_factor IS NULL THEN
    RAISE EXCEPTION 'No conversion found: % to %', p_from_unit, p_to_unit;
  END IF;

  RETURN p_quantity * v_factor;
END;
$$ LANGUAGE plpgsql;

-- 2. Calculate Product Cost Function
CREATE OR REPLACE FUNCTION calculate_product_cost(p_item_id UUID)
RETURNS TABLE(
  raw_material VARCHAR,
  quantity DECIMAL,
  unit VARCHAR,
  unit_price DECIMAL,
  total_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.material_name::VARCHAR,
    m.total_quantity,
    m.unit::VARCHAR,
    i.latest_purchase_price,
    m.total_quantity * i.latest_purchase_price
  FROM mv_flattened_bom m
  JOIN items i ON i.id = m.material_id
  WHERE m.product_id = p_item_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Get Low Stock Items Function
CREATE OR REPLACE FUNCTION get_low_stock_items(p_store_id UUID)
RETURNS TABLE(
  item_name VARCHAR,
  current_quantity DECIMAL,
  safety_stock DECIMAL,
  shortage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.name::VARCHAR,
    inv.theoretical_quantity,
    i.safety_stock,
    (i.safety_stock - inv.theoretical_quantity) AS shortage
  FROM inventory inv
  JOIN items i ON i.id = inv.item_id
  WHERE inv.store_id = p_store_id
    AND inv.theoretical_quantity < i.safety_stock
    AND i.is_inventory_managed = true
  ORDER BY shortage DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Get Expiring Items Function
CREATE OR REPLACE FUNCTION get_expiring_items(
  p_store_id UUID,
  p_days_threshold INT DEFAULT 7
) RETURNS TABLE(
  item_name VARCHAR,
  lot_number VARCHAR,
  remaining_quantity DECIMAL,
  expiry_date DATE,
  days_until_expiry INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.name::VARCHAR,
    il.lot_number::VARCHAR,
    il.remaining_quantity,
    il.expiry_date,
    (il.expiry_date - CURRENT_DATE)::INT
  FROM inventory_lots il
  JOIN items i ON i.id = il.item_id
  WHERE il.store_id = p_store_id
    AND il.expiry_date IS NOT NULL
    AND il.expiry_date <= CURRENT_DATE + p_days_threshold
    AND il.remaining_quantity > 0
  ORDER BY il.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. Start Physical Count Function
CREATE OR REPLACE FUNCTION start_physical_count(
  p_store_id UUID,
  p_count_date DATE,
  p_zone VARCHAR,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_count_id UUID;
BEGIN
  INSERT INTO physical_counts (
    store_id,
    count_date,
    count_type,
    zone,
    counted_by
  ) VALUES (
    p_store_id,
    p_count_date,
    'spot',
    p_zone,
    p_user_id
  ) RETURNING id INTO v_count_id;

  RETURN v_count_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Record Count Item Function (with Upsert logic)
CREATE OR REPLACE FUNCTION record_count_item(
  p_count_id UUID,
  p_item_id UUID,
  p_counted_quantity DECIMAL,
  p_unit unit_type,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_system_qty DECIMAL;
BEGIN
  SELECT theoretical_quantity INTO v_system_qty
  FROM inventory
  WHERE store_id = (SELECT store_id FROM physical_counts WHERE id = p_count_id)
    AND item_id = p_item_id;

  INSERT INTO physical_count_items (
    physical_count_id,
    item_id,
    counted_quantity,
    unit,
    system_quantity,
    notes
  ) VALUES (
    p_count_id,
    p_item_id,
    p_counted_quantity,
    p_unit,
    COALESCE(v_system_qty, 0),
    p_notes
  )
  ON CONFLICT (physical_count_id, item_id)
  DO UPDATE SET
    counted_quantity = physical_count_items.counted_quantity + EXCLUDED.counted_quantity,
    notes = COALESCE(physical_count_items.notes, '') || ' | ' || EXCLUDED.notes;
END;
$$ LANGUAGE plpgsql;

-- 7. Complete Physical Count Function
CREATE OR REPLACE FUNCTION complete_physical_count(p_count_id UUID)
RETURNS VOID AS $$
DECLARE
  v_item RECORD;
  v_store_id UUID;
  v_count_date DATE;
BEGIN
  SELECT store_id, count_date INTO v_store_id, v_count_date
  FROM physical_counts
  WHERE id = p_count_id;

  FOR v_item IN
    SELECT
      item_id,
      counted_quantity,
      system_quantity,
      variance,
      unit
    FROM physical_count_items
    WHERE physical_count_id = p_count_id
  LOOP
    UPDATE inventory
    SET
      physical_quantity = v_item.counted_quantity,
      theoretical_quantity = v_item.counted_quantity,
      last_physical_count_at = NOW(),
      last_updated_at = NOW()
    WHERE store_id = v_store_id
      AND item_id = v_item.item_id;

    IF v_item.variance != 0 THEN
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
        v_item.item_id,
        'adjustment',
        v_item.variance,
        v_item.unit,
        'physical_count',
        p_count_id,
        v_count_date,
        'Physical count adjustment'
      );
    END IF;
  END LOOP;

  UPDATE physical_counts
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_count_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Helper: Smart Inventory Deduction (Hierarchical + Unit Conversion)
CREATE OR REPLACE FUNCTION deduct_inventory_smart(
  p_store_id UUID,
  p_item_id UUID,
  p_quantity DECIMAL,
  p_transaction_date DATE,
  p_ref_type VARCHAR,
  p_ref_id UUID
) RETURNS VOID AS $$
DECLARE
  v_current_stock DECIMAL;
  v_recipe_id UUID;
  v_ingredient RECORD;
  v_is_managed BOOLEAN;
BEGIN
  -- Check if item is inventory managed
  SELECT is_inventory_managed INTO v_is_managed
  FROM items WHERE id = p_item_id;

  -- Check current stock
  SELECT theoretical_quantity INTO v_current_stock
  FROM inventory
  WHERE store_id = p_store_id AND item_id = p_item_id;
  
  v_current_stock := COALESCE(v_current_stock, 0);

  -- Check if recipe exists (Active)
  SELECT id INTO v_recipe_id
  FROM recipes
  WHERE store_id = p_store_id AND output_item_id = p_item_id AND is_active = true
  LIMIT 1;

  IF v_current_stock >= p_quantity THEN
    -- Case A: Sufficient stock. Just deduct.
    UPDATE inventory
    SET theoretical_quantity = theoretical_quantity - p_quantity,
        last_updated_at = NOW()
    WHERE store_id = p_store_id AND item_id = p_item_id;

    INSERT INTO inventory_transactions (
      store_id, item_id, transaction_type, quantity, unit, reference_type, reference_id, transaction_date
    ) VALUES (
      p_store_id, p_item_id, 'sale', -p_quantity, 
      (SELECT base_unit FROM items WHERE id = p_item_id), 
      p_ref_type, p_ref_id, p_transaction_date
    );

  ELSIF v_recipe_id IS NOT NULL THEN
    -- Case B: Insufficient stock, but Recipe exists.
    -- 1. Consume what we have (if any)
    IF v_current_stock > 0 THEN
      UPDATE inventory
      SET theoretical_quantity = 0,
          last_updated_at = NOW()
      WHERE store_id = p_store_id AND item_id = p_item_id;

      INSERT INTO inventory_transactions (
        store_id, item_id, transaction_type, quantity, unit, reference_type, reference_id, transaction_date
      ) VALUES (
        p_store_id, p_item_id, 'sale', -v_current_stock, 
        (SELECT base_unit FROM items WHERE id = p_item_id), 
        p_ref_type, p_ref_id, p_transaction_date
      );
    END IF;

    -- 2. Explode remainder to ingredients
    FOR v_ingredient IN
      SELECT ri.input_item_id, ri.quantity, ri.unit, i.base_unit
      FROM recipe_items ri
      JOIN items i ON i.id = ri.input_item_id
      WHERE ri.recipe_id = v_recipe_id
    LOOP
      PERFORM deduct_inventory_smart(
        p_store_id, 
        v_ingredient.input_item_id, 
        convert_unit(v_ingredient.quantity, v_ingredient.unit, v_ingredient.base_unit, v_ingredient.input_item_id) 
        * (p_quantity - GREATEST(v_current_stock, 0)), 
        p_transaction_date, 
        p_ref_type, 
        p_ref_id
      );
    END LOOP;

  ELSE
    -- Case C: No recipe (Raw material or standalone product). Force negative.
    UPDATE inventory
    SET theoretical_quantity = theoretical_quantity - p_quantity,
        last_updated_at = NOW()
    WHERE store_id = p_store_id AND item_id = p_item_id;
    
    IF NOT FOUND THEN
      INSERT INTO inventory (store_id, item_id, theoretical_quantity)
      VALUES (p_store_id, p_item_id, -p_quantity);
    END IF;

    INSERT INTO inventory_transactions (
      store_id, item_id, transaction_type, quantity, unit, reference_type, reference_id, transaction_date
    ) VALUES (
      p_store_id, p_item_id, 'sale', -p_quantity, 
      (SELECT base_unit FROM items WHERE id = p_item_id), 
      p_ref_type, p_ref_id, p_transaction_date
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger Function: Process Sale Inventory (Enhanced with Smart Deduction + UPDATE/DELETE)
CREATE OR REPLACE FUNCTION process_sale_inventory()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id UUID;
  v_sale_date DATE;
  v_diff DECIMAL;
BEGIN
  -- Handle INSERT
  IF (TG_OP = 'INSERT') THEN
    SELECT store_id, sale_date INTO v_store_id, v_sale_date
    FROM sales WHERE id = NEW.sale_id;
    
    PERFORM deduct_inventory_smart(
      v_store_id, NEW.item_id, NEW.quantity, v_sale_date, 'sale_item', NEW.id
    );
    RETURN NEW;

  -- Handle DELETE (Restore Inventory)
  ELSIF (TG_OP = 'DELETE') THEN
    SELECT store_id, sale_date INTO v_store_id, v_sale_date
    FROM sales WHERE id = OLD.sale_id;
    
    UPDATE inventory
    SET theoretical_quantity = theoretical_quantity + OLD.quantity,
        last_updated_at = NOW()
    WHERE store_id = v_store_id AND item_id = OLD.item_id;
    
    INSERT INTO inventory_transactions (
      store_id, item_id, transaction_type, quantity, unit, reference_type, reference_id, transaction_date, notes
    ) VALUES (
      v_store_id, OLD.item_id, 'sale', OLD.quantity, -- Positive quantity for restoration
      (SELECT base_unit FROM items WHERE id = OLD.item_id),
      'sale_cancel', OLD.id, v_sale_date, 'Order Cancelled/Deleted'
    );
    
    RETURN OLD;

  -- Handle UPDATE
  ELSIF (TG_OP = 'UPDATE') THEN
    SELECT store_id, sale_date INTO v_store_id, v_sale_date
    FROM sales WHERE id = NEW.sale_id;
    
    v_diff := NEW.quantity - OLD.quantity;
    
    IF v_diff > 0 THEN
      -- Increased quantity: Deduct more
      PERFORM deduct_inventory_smart(
        v_store_id, NEW.item_id, v_diff, v_sale_date, 'sale_update', NEW.id
      );
    ELSIF v_diff < 0 THEN
      -- Decreased quantity: Add back (Restore)
      UPDATE inventory
      SET theoretical_quantity = theoretical_quantity + ABS(v_diff),
          last_updated_at = NOW()
      WHERE store_id = v_store_id AND item_id = NEW.item_id;
      
      INSERT INTO inventory_transactions (
        store_id, item_id, transaction_type, quantity, unit, reference_type, reference_id, transaction_date, notes
      ) VALUES (
        v_store_id, NEW.item_id, 'sale', ABS(v_diff),
        (SELECT base_unit FROM items WHERE id = NEW.item_id),
        'sale_update', NEW.id, v_sale_date, 'Quantity Reduced'
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_inventory_deduction
  AFTER INSERT OR UPDATE OR DELETE ON sales_items
  FOR EACH ROW
  EXECUTE FUNCTION process_sale_inventory();

-- 10. Trigger Function: Process Purchase Receipt
CREATE OR REPLACE FUNCTION process_purchase_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id UUID;
  v_received_date DATE;
BEGIN
  -- Get PO info
  SELECT store_id, received_date INTO v_store_id, v_received_date
  FROM purchase_orders WHERE id = NEW.purchase_order_id;

  -- Update Inventory
  INSERT INTO inventory (store_id, item_id, theoretical_quantity)
  VALUES (v_store_id, NEW.item_id, NEW.received_quantity)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET
    theoretical_quantity = inventory.theoretical_quantity + NEW.received_quantity,
    last_updated_at = NOW();

  -- Record Transaction
  INSERT INTO inventory_transactions (
    store_id,
    item_id,
    transaction_type,
    quantity,
    unit,
    unit_cost,
    total_cost,
    reference_type,
    reference_id,
    transaction_date
  ) VALUES (
    v_store_id,
    NEW.item_id,
    'purchase',
    NEW.received_quantity,
    NEW.unit,
    NEW.unit_price,
    NEW.received_quantity * NEW.unit_price,
    'purchase_order',
    NEW.purchase_order_id,
    v_received_date
  );

  -- Create Lot
  INSERT INTO inventory_lots (
    store_id,
    item_id,
    lot_number,
    quantity,
    remaining_quantity,
    unit,
    received_date,
    expiry_date,
    unit_cost,
    purchase_order_item_id
  ) VALUES (
    v_store_id,
    NEW.item_id,
    'LOT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || NEW.id,
    NEW.received_quantity,
    NEW.received_quantity,
    NEW.unit,
    v_received_date,
    NEW.expiry_date,
    NEW.unit_price,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_receipt_inventory
  AFTER UPDATE OF received_quantity ON purchase_order_items
  FOR EACH ROW
  WHEN (OLD.received_quantity IS DISTINCT FROM NEW.received_quantity)
  EXECUTE FUNCTION process_purchase_receipt();

-- 11. Trigger: Sync User Role to Metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync store_id and role to auth.users metadata for RLS optimization
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('store_id', NEW.store_id, 'role', NEW.role)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_user_role
  AFTER INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_metadata();