export type UnitType = 'kg' | 'g' | 'l' | 'ml' | 'ea' | 'box' | 'pack';
export type ItemType = 'raw' | 'semi_finished' | 'finished';

export interface Item {
  id: string;
  store_id: string;
  code: string | null;
  name: string;
  type: ItemType;
  base_unit: UnitType;
  safety_stock: number | null;
  sale_price: number | null;
  latest_purchase_price: number | null;
  category_id: string | null;
  category?: {
    name: string;
  };
}

export type TransactionType = 
  | 'purchase' 
  | 'sale' 
  | 'adjustment' 
  | 'waste' 
  | 'production' 
  | 'transfer';

export interface InventoryItem {
  id: string;
  store_id: string;
  item_id: string;
  theoretical_quantity: number;
  physical_quantity: number | null;
  variance: number | null;
  variance_percent: number | null;
  last_physical_count_at: string | null;
  last_updated_at: string;
  item: Item;
  isLowStock?: boolean;
}

export interface InventoryTransaction {
  id: string;
  store_id: string;
  item_id: string;
  transaction_type: TransactionType;
  quantity: number;
  unit: UnitType;
  reference_type: string | null;
  reference_id: string | null;
  unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  transaction_date: string;
  created_by: string | null;
  created_at: string;
  item?: {
    name: string;
  };
}