-- ==========================================
-- Inventory Management Functions
-- ==========================================

-- 1. Start Physical Count
CREATE OR REPLACE FUNCTION start_physical_count(
  p_store_id UUID,
  p_count_date DATE,
  p_zone VARCHAR,
  p_user_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 2. Record Count Item
CREATE OR REPLACE FUNCTION record_count_item(
  p_count_id UUID,
  p_item_id UUID,
  p_counted_quantity DECIMAL,
  p_unit unit_type,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_system_qty DECIMAL;
  v_store_id UUID;
BEGIN
  SELECT store_id INTO v_store_id FROM physical_counts WHERE id = p_count_id;

  -- Get current system quantity
  SELECT theoretical_quantity INTO v_system_qty
  FROM inventory
  WHERE store_id = v_store_id
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
    counted_quantity = EXCLUDED.counted_quantity,
    unit = EXCLUDED.unit,
    system_quantity = EXCLUDED.system_quantity,
    notes = EXCLUDED.notes;
END;
$$;

-- 3. Complete Physical Count
CREATE OR REPLACE FUNCTION complete_physical_count(p_count_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    -- Update inventory with physical count
    INSERT INTO inventory (store_id, item_id, theoretical_quantity, physical_quantity, last_physical_count_at, last_updated_at)
    VALUES (v_store_id, v_item.item_id, v_item.counted_quantity, v_item.counted_quantity, NOW(), NOW())
    ON CONFLICT (store_id, item_id)
    DO UPDATE SET
      physical_quantity = v_item.counted_quantity,
      theoretical_quantity = v_item.counted_quantity, -- Adjust theoretical to match physical
      last_physical_count_at = NOW(),
      last_updated_at = NOW();

    -- Record adjustment transaction if there is variance
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
$$;

-- 4. Get Low Stock Items
CREATE OR REPLACE FUNCTION get_low_stock_items(p_store_id UUID)
RETURNS TABLE(
  item_name VARCHAR,
  current_quantity DECIMAL,
  safety_stock DECIMAL,
  shortage DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 5. Get Expiring Items
CREATE OR REPLACE FUNCTION get_expiring_items(
  p_store_id UUID,
  p_days_threshold INT DEFAULT 7
) RETURNS TABLE(
  item_name VARCHAR,
  lot_number VARCHAR,
  remaining_quantity DECIMAL,
  expiry_date DATE,
  days_until_expiry INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_physical_count TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_count_item TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION complete_physical_count TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_low_stock_items TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_expiring_items TO authenticated, service_role;