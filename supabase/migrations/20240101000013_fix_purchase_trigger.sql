-- 구매 입고 시 재고 증가 트리거 수정

CREATE OR REPLACE FUNCTION process_purchase_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id UUID;
  v_qty_diff DECIMAL;
BEGIN
  -- 디버깅용 강제 에러 (트리거 실행 여부 확인)
  -- RAISE EXCEPTION 'Trigger process_purchase_receipt started! ID: %, Qty: %', NEW.id, NEW.received_quantity;

  RAISE NOTICE 'Trigger process_purchase_receipt started. OP: %, ID: %', TG_OP, NEW.id;

  -- Store ID 조회
  SELECT store_id INTO v_store_id
  FROM purchase_orders WHERE id = NEW.purchase_order_id;
  
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Purchase Order not found for item %', NEW.id;
  END IF;

  RAISE NOTICE 'Found Store ID: %', v_store_id;

  -- 변경된 수량 계산
  IF TG_OP = 'INSERT' THEN
    v_qty_diff := NEW.received_quantity;
  ELSE
    v_qty_diff := NEW.received_quantity - OLD.received_quantity;
  END IF;
  
  RAISE NOTICE 'Quantity Diff: %', v_qty_diff;

  -- 변경량이 0이면 종료
  IF v_qty_diff = 0 THEN
    RAISE NOTICE 'Quantity diff is 0, skipping inventory update';
    RETURN NEW;
  END IF;

  -- Inventory 업데이트
  RAISE NOTICE 'Updating Inventory... Item: %, Qty: %', NEW.item_id, v_qty_diff;
  
  INSERT INTO inventory (store_id, item_id, theoretical_quantity)
  VALUES (v_store_id, NEW.item_id, v_qty_diff)
  ON CONFLICT (store_id, item_id)
  DO UPDATE SET
    theoretical_quantity = inventory.theoretical_quantity + v_qty_diff,
    last_updated_at = NOW();
    
  RAISE NOTICE 'Inventory updated.';

  -- Transaction 기록
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
    v_qty_diff,
    NEW.unit,
    NEW.unit_price,
    v_qty_diff * NEW.unit_price,
    'purchase_order',
    NEW.purchase_order_id,
    CURRENT_DATE
  );
  
  RAISE NOTICE 'Transaction recorded.';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 재생성 (기존 트리거가 있다면 삭제 후 재생성)
DROP TRIGGER IF EXISTS trg_purchase_receipt_inventory ON purchase_order_items;

CREATE TRIGGER trg_purchase_receipt_inventory
  AFTER INSERT OR UPDATE OF received_quantity ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION process_purchase_receipt();