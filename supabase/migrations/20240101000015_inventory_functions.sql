-- 1. Start Physical Count
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

-- 2. Complete Physical Count
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
    -- Update Inventory
    UPDATE inventory
    SET
      physical_quantity = v_item.counted_quantity,
      theoretical_quantity = v_item.counted_quantity,
      last_physical_count_at = NOW(),
      last_updated_at = NOW()
    WHERE store_id = v_store_id
      AND item_id = v_item.item_id;

    -- Create Inventory if it doesn't exist (though physical count usually implies item exists, but just in case)
    IF NOT FOUND THEN
      INSERT INTO inventory (store_id, item_id, theoretical_quantity, physical_quantity, last_physical_count_at, last_updated_at)
      VALUES (v_store_id, v_item.item_id, v_item.counted_quantity, v_item.counted_quantity, NOW(), NOW());
    END IF;

    -- Record Transaction if there is variance
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

-- 3. Get Low Stock Items
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

-- 4. Get Expiring Items
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