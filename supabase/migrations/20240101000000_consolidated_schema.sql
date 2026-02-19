-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUM Types
-- ==========================================
CREATE TYPE item_type AS ENUM ('raw', 'semi_finished', 'finished');
CREATE TYPE unit_type AS ENUM ('kg', 'g', 'l', 'ml', 'ea', 'box', 'pack');
CREATE TYPE transaction_type AS ENUM (
  'purchase',      -- 입고
  'sale',          -- 판매 출고
  'adjustment',    -- 조정 (실사 후)
  'waste',         -- 폐기
  'production',    -- 생산
  'transfer'       -- 매장 간 이동
);
CREATE TYPE po_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');

-- ==========================================
-- 2. Core Tables (Multi-tenancy)
-- ==========================================

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  business_number VARCHAR(20),
  subscription_plan VARCHAR(50) DEFAULT 'trial',
  subscription_status VARCHAR(20) DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  subscription_started_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stores
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  opening_date DATE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_stores_org ON stores(organization_id);
CREATE INDEX idx_stores_code ON stores(organization_id, code);

-- Users (public profile linked to auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  google_id VARCHAR(255) UNIQUE,
  kakao_id VARCHAR(255) UNIQUE,
  naver_id VARCHAR(255) UNIQUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- User Roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'owner', 'manager', 'staff'
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_store ON user_roles(store_id);

-- Unit Conversions
CREATE TABLE unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit unit_type NOT NULL,
  to_unit unit_type NOT NULL,
  conversion_factor DECIMAL(15, 6) NOT NULL,
  item_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_unit, to_unit, item_id)
);
CREATE INDEX idx_unit_conv_from_to ON unit_conversions(from_unit, to_unit);

INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor) VALUES
  ('kg', 'g', 1000),
  ('g', 'kg', 0.001),
  ('l', 'ml', 1000),
  ('ml', 'l', 0.001),
  ('box', 'ea', 12),
  ('pack', 'g', 500);

-- ==========================================
-- 3. BOM Tables
-- ==========================================

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_categories_store ON categories(store_id);

-- Items
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  type item_type NOT NULL,
  category_id UUID REFERENCES categories(id),
  base_unit unit_type NOT NULL,
  purchase_unit unit_type,
  sale_price DECIMAL(10, 2),
  latest_purchase_price DECIMAL(10, 2),
  is_inventory_managed BOOLEAN DEFAULT true,
  safety_stock DECIMAL(10, 3),
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_items_store ON items(store_id);
CREATE INDEX idx_items_type ON items(store_id, type);

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  output_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  output_quantity DECIMAL(10, 3) NOT NULL DEFAULT 1,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  name VARCHAR(255),
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, output_item_id, version)
);
CREATE INDEX idx_recipes_output ON recipes(output_item_id);

-- Recipe Items
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  input_item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity DECIMAL(10, 3) NOT NULL,
  unit unit_type NOT NULL,
  sort_order INT DEFAULT 0,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);

-- Item Options (Additional ingredients for customization)
CREATE TABLE item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  option_name VARCHAR(100) NOT NULL,
  option_value VARCHAR(100),
  additional_ingredient_id UUID REFERENCES items(id),
  additional_quantity DECIMAL(10, 3),
  additional_unit unit_type,
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_item_options_item ON item_options(item_id);

-- ==========================================
-- 4. Inventory & Sales Tables
-- ==========================================

-- Suppliers
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

-- Purchase Orders
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

-- Purchase Order Items
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

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  theoretical_quantity DECIMAL(15, 3) DEFAULT 0,
  physical_quantity DECIMAL(15, 3),
  variance DECIMAL(15, 3) GENERATED ALWAYS AS (physical_quantity - theoretical_quantity) STORED,
  variance_percent DECIMAL(5, 2),
  last_physical_count_at TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, item_id)
);
CREATE INDEX idx_inventory_store ON inventory(store_id);

-- Inventory Transactions
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  transaction_type transaction_type NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL,
  unit unit_type NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  notes TEXT,
  transaction_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_inv_trans_store ON inventory_transactions(store_id);

-- Inventory Lots
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

-- Physical Counts
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

-- Physical Count Items
CREATE TABLE physical_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  physical_count_id UUID NOT NULL REFERENCES physical_counts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  counted_quantity DECIMAL(15, 3) NOT NULL,
  unit unit_type NOT NULL,
  system_quantity DECIMAL(15, 3),
  variance DECIMAL(15, 3) GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  adjustment_reason VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(physical_count_id, item_id)
);
CREATE INDEX idx_pci_pc ON physical_count_items(physical_count_id);

-- Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number VARCHAR(100),
  channel VARCHAR(50),
  total_amount DECIMAL(10, 2),
  sale_date DATE NOT NULL,
  sale_time TIME,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sales_store ON sales(store_id);

-- Sales Items
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

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_expenses_store ON expenses(store_id);

-- Invitations
CREATE TABLE store_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(store_id, email)
);
CREATE INDEX idx_invitations_store ON store_invitations(store_id);
CREATE INDEX idx_invitations_token ON store_invitations(token);

-- ==========================================
-- 5. RLS Policies
-- ==========================================

-- Helper function for RLS
CREATE OR REPLACE FUNCTION is_store_member(store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND store_id = $1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_store_admin(store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND store_id = $1
    AND role IN ('owner', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_invitations ENABLE ROW LEVEL SECURITY;

-- Policy Definitions (Simplified for brevity, ensuring standard pattern)

-- Organizations & Stores: Viewable by members
CREATE POLICY "Members can view organizations" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
);
CREATE POLICY "Members can view stores" ON stores FOR SELECT USING (
  id IN (SELECT store_id FROM user_roles WHERE user_id = auth.uid())
);

-- Users: Viewable by self or co-workers
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- User Roles: Viewable by members of same store/org
CREATE POLICY "Members can view roles" ON user_roles FOR SELECT USING (
  user_id = auth.uid() OR 
  store_id IN (SELECT store_id FROM user_roles WHERE user_id = auth.uid())
);

-- Business Data Policies (Items, Inventory, Sales, etc.)
-- Pattern: SELECT for members, INSERT/UPDATE/DELETE for admins (owner/manager)

-- Items
CREATE POLICY "Members can view items" ON items FOR SELECT USING (is_store_member(store_id));
CREATE POLICY "Admins can manage items" ON items FOR ALL USING (is_store_admin(store_id));

-- Inventory
CREATE POLICY "Members can view inventory" ON inventory FOR SELECT USING (is_store_member(store_id));
CREATE POLICY "Admins can manage inventory" ON inventory FOR ALL USING (is_store_admin(store_id));

-- Sales
CREATE POLICY "Members can view sales" ON sales FOR SELECT USING (is_store_member(store_id));
CREATE POLICY "Admins can manage sales" ON sales FOR ALL USING (is_store_admin(store_id));

-- Expenses
CREATE POLICY "Members can view expenses" ON expenses FOR SELECT USING (is_store_member(store_id));
CREATE POLICY "Admins can manage expenses" ON expenses FOR ALL USING (is_store_admin(store_id));

-- Invitations
CREATE POLICY "Admins can manage invitations" ON store_invitations FOR ALL USING (is_store_admin(store_id));

-- ==========================================
-- 6. Functions & Triggers
-- ==========================================

-- Auth Hook: Create public user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Materialized View for BOM
CREATE MATERIALIZED VIEW mv_flattened_bom AS
WITH RECURSIVE bom_tree AS (
  SELECT
    r.output_item_id AS product_id,
    ri.input_item_id AS material_id,
    ri.quantity,
    ri.unit,
    1 AS level
  FROM recipes r
  JOIN recipe_items ri ON ri.recipe_id = r.id
  WHERE r.is_active = true
  UNION ALL
  SELECT
    bt.product_id,
    ri.input_item_id,
    bt.quantity * ri.quantity,
    ri.unit,
    bt.level + 1
  FROM bom_tree bt
  JOIN items i ON i.id = bt.material_id
  JOIN recipes r ON r.output_item_id = i.id AND r.is_active = true
  JOIN recipe_items ri ON ri.recipe_id = r.id
  WHERE i.type != 'raw'
)
SELECT
  bt.product_id,
  p.name AS product_name,
  bt.material_id,
  m.name AS material_name,
  SUM(bt.quantity) AS total_quantity,
  bt.unit
FROM bom_tree bt
JOIN items p ON p.id = bt.product_id
JOIN items m ON m.id = bt.material_id
WHERE m.type = 'raw'
GROUP BY bt.product_id, p.name, bt.material_id, m.name, bt.unit;

CREATE INDEX idx_mv_bom_product ON mv_flattened_bom(product_id);

-- Sales Trigger: Deduct Inventory
CREATE OR REPLACE FUNCTION process_sale_inventory()
RETURNS TRIGGER AS $$
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
     -- Logic for simple deduction if needed, or skip
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_inventory_deduction
  AFTER INSERT ON sales_items
  FOR EACH ROW
  EXECUTE FUNCTION process_sale_inventory();

-- Purchase Trigger: Add Inventory
CREATE OR REPLACE FUNCTION process_purchase_receipt()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id UUID;
  v_received_date DATE;
BEGIN
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
    store_id, item_id, transaction_type, quantity, unit, unit_cost, total_cost, reference_type, reference_id, transaction_date
  ) VALUES (
    v_store_id, NEW.item_id, 'purchase', NEW.received_quantity, NEW.unit, NEW.unit_price, NEW.received_quantity * NEW.unit_price, 'purchase_order', NEW.purchase_order_id, v_received_date
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_receipt_inventory
  AFTER UPDATE OF received_quantity ON purchase_order_items
  FOR EACH ROW
  WHEN (OLD.received_quantity IS DISTINCT FROM NEW.received_quantity)
  EXECUTE FUNCTION process_purchase_receipt();

-- Sample Data Generator Function
CREATE OR REPLACE FUNCTION create_sample_data(
  p_store_id UUID,
  p_store_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_raw_id UUID;
  v_category_bread_id UUID;
  v_item_flour_id UUID;
  v_item_butter_id UUID;
  v_item_croissant_id UUID;
  v_recipe_id UUID;
BEGIN
  -- Simple sample data generation
  INSERT INTO categories (store_id, name) VALUES (p_store_id, '원자재') RETURNING id INTO v_category_raw_id;
  INSERT INTO categories (store_id, name) VALUES (p_store_id, '베이커리') RETURNING id INTO v_category_bread_id;

  INSERT INTO items (store_id, name, code, type, category_id, base_unit, purchase_unit, latest_purchase_price, safety_stock)
  VALUES (p_store_id, '박력분', 'RAW-001', 'raw', v_category_raw_id, 'g', 'kg', 0.005, 5000)
  RETURNING id INTO v_item_flour_id;

  INSERT INTO items (store_id, name, code, type, category_id, base_unit, purchase_unit, latest_purchase_price, safety_stock)
  VALUES (p_store_id, '버터', 'RAW-002', 'raw', v_category_raw_id, 'g', 'kg', 0.015, 2000)
  RETURNING id INTO v_item_butter_id;

  INSERT INTO items (store_id, name, code, type, category_id, base_unit, sale_price, is_inventory_managed)
  VALUES (p_store_id, '크로와상', 'BAKE-001', 'finished', v_category_bread_id, 'ea', 4500, true)
  RETURNING id INTO v_item_croissant_id;

  INSERT INTO recipes (store_id, output_item_id, output_quantity, name)
  VALUES (p_store_id, v_item_croissant_id, 1, '기본 크로와상')
  RETURNING id INTO v_recipe_id;

  INSERT INTO recipe_items (recipe_id, input_item_id, quantity, unit)
  VALUES (v_recipe_id, v_item_flour_id, 50, 'g'), (v_recipe_id, v_item_butter_id, 30, 'g');
  
  -- Refresh view
  REFRESH MATERIALIZED VIEW mv_flattened_bom;
END;
$$;

-- Onboarding RPC (Final Version)
CREATE OR REPLACE FUNCTION create_initial_organization_v2(
  p_org_name TEXT,
  p_store_name TEXT,
  p_store_type TEXT DEFAULT 'bakery',
  p_include_sample_data BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_org_id UUID;
  v_new_store_id UUID;
  v_user_id UUID;
  v_existing_role RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Idempotency check
  SELECT * INTO v_existing_role FROM user_roles WHERE user_id = v_user_id LIMIT 1;
  IF FOUND THEN
    RETURN json_build_object(
      'organization_id', v_existing_role.organization_id,
      'store_id', v_existing_role.store_id,
      'already_exists', true
    );
  END IF;

  -- 1. Organization
  INSERT INTO organizations (name, slug)
  VALUES (p_org_name, lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(random() * 10000)::text)
  RETURNING id INTO v_new_org_id;

  -- 2. Store
  INSERT INTO stores (organization_id, name, code, settings)
  VALUES (v_new_org_id, p_store_name, upper(substring(p_store_name, 1, 3)) || floor(random() * 1000)::text, jsonb_build_object('type', p_store_type))
  RETURNING id INTO v_new_store_id;

  -- 3. Role
  INSERT INTO user_roles (user_id, organization_id, store_id, role)
  VALUES (v_user_id, v_new_org_id, v_new_store_id, 'owner');

  -- 4. Sample Data
  IF p_include_sample_data THEN
    PERFORM create_sample_data(v_new_store_id, p_store_type);
  END IF;

  RETURN json_build_object(
    'organization_id', v_new_org_id,
    'store_id', v_new_store_id,
    'created', true
  );
END;
$$;