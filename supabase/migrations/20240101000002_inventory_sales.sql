-- 1. Suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  business_number VARCHAR(20),

  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,

  payment_terms TEXT,
  delivery_days INT,

  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suppliers_store ON suppliers(store_id);

-- 2. Purchase Orders (PO)
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  po_number VARCHAR(50) UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),

  status po_status DEFAULT 'draft',

  order_date DATE,
  expected_delivery_date DATE,
  received_date DATE,

  total_amount DECIMAL(10, 2),

  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_po_store ON purchase_orders(store_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- 3. Purchase Order Items
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),

  ordered_quantity DECIMAL(15, 3) NOT NULL,
  received_quantity DECIMAL(15, 3) DEFAULT 0,
  unit unit_type NOT NULL,

  unit_price DECIMAL(10, 2),

  expiry_date DATE,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_poi_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_poi_item ON purchase_order_items(item_id);

-- 4. Inventory (Current Stock)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  -- Quantities
  theoretical_quantity DECIMAL(15, 3) DEFAULT 0,
  physical_quantity DECIMAL(15, 3),

  -- Variance Analysis
  variance DECIMAL(15, 3) GENERATED ALWAYS AS
    (physical_quantity - theoretical_quantity) STORED,
  variance_percent DECIMAL(5, 2),

  last_physical_count_at TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(store_id, item_id)
);

CREATE INDEX idx_inventory_store ON inventory(store_id);
CREATE INDEX idx_inventory_item ON inventory(item_id);

-- 5. Inventory Transactions (History)
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  transaction_type transaction_type NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL,
  unit unit_type NOT NULL,

  -- Reference
  reference_type VARCHAR(50),
  reference_id UUID,

  -- Cost Info
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),

  notes TEXT,
  transaction_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inv_trans_store ON inventory_transactions(store_id);
CREATE INDEX idx_inv_trans_item ON inventory_transactions(item_id);
CREATE INDEX idx_inv_trans_date ON inventory_transactions(transaction_date DESC);
CREATE INDEX idx_inv_trans_type ON inventory_transactions(transaction_type);

-- 6. Inventory Lots (FIFO)
CREATE TABLE inventory_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  lot_number VARCHAR(100),

  quantity DECIMAL(15, 3) NOT NULL,
  remaining_quantity DECIMAL(15, 3) NOT NULL,
  unit unit_type NOT NULL,

  received_date DATE NOT NULL,
  expiry_date DATE,

  unit_cost DECIMAL(10, 2),

  purchase_order_item_id UUID,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lots_store ON inventory_lots(store_id);
CREATE INDEX idx_lots_item ON inventory_lots(item_id);
CREATE INDEX idx_lots_expiry ON inventory_lots(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_lots_fifo ON inventory_lots(item_id, received_date);

-- 7. Physical Counts (Stocktake)
CREATE TABLE physical_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  count_date DATE NOT NULL,
  count_type VARCHAR(50),
  zone VARCHAR(100),

  status VARCHAR(20) DEFAULT 'in_progress',

  counted_by UUID REFERENCES users(id),
  verified_by UUID REFERENCES users(id),

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_pc_store ON physical_counts(store_id);
CREATE INDEX idx_pc_date ON physical_counts(count_date DESC);

-- 8. Physical Count Items
CREATE TABLE physical_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physical_count_id UUID NOT NULL REFERENCES physical_counts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),

  counted_quantity DECIMAL(15, 3) NOT NULL,
  unit unit_type NOT NULL,

  system_quantity DECIMAL(15, 3),

  variance DECIMAL(15, 3) GENERATED ALWAYS AS
    (counted_quantity - system_quantity) STORED,

  adjustment_reason VARCHAR(100),
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(physical_count_id, item_id)
);

CREATE INDEX idx_pci_pc ON physical_count_items(physical_count_id);
CREATE INDEX idx_pci_item ON physical_count_items(item_id);

-- 9. Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  order_number VARCHAR(100),
  channel VARCHAR(50), -- 'pos', 'baemin', 'coupang'
  total_amount DECIMAL(10, 2),

  sale_date DATE NOT NULL,
  sale_time TIME,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_date ON sales(sale_date DESC);
CREATE INDEX idx_sales_channel ON sales(channel);

-- 10. Sales Items
CREATE TABLE sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),

  quantity DECIMAL(15, 3) NOT NULL,
  unit_price DECIMAL(10, 2),

  options JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_items_sale ON sales_items(sale_id);
CREATE INDEX idx_sales_items_item ON sales_items(item_id);