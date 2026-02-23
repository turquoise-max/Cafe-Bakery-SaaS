-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ENUM Types
-- ==========================================
DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('raw', 'semi_finished', 'finished');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_type AS ENUM ('kg', 'g', 'l', 'ml', 'ea', 'box', 'pack');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'purchase',      -- 입고
        'sale',          -- 판매 출고
        'adjustment',    -- 조정 (실사 후)
        'waste',         -- 폐기
        'production',    -- 생산
        'transfer'       -- 매장 간 이동
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE po_status AS ENUM ('draft', 'ordered', 'received', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. Core Tables (Multi-tenancy)
-- ==========================================

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
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
CREATE TABLE IF NOT EXISTS stores (
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
CREATE INDEX IF NOT EXISTS idx_stores_org ON stores(organization_id);
CREATE INDEX IF NOT EXISTS idx_stores_code ON stores(organization_id, code);

-- Users (public profile linked to auth.users)
CREATE TABLE IF NOT EXISTS users (
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'owner', 'manager', 'staff'
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_store ON user_roles(store_id);

-- Unit Conversions
CREATE TABLE IF NOT EXISTS unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit unit_type NOT NULL,
  to_unit unit_type NOT NULL,
  conversion_factor DECIMAL(15, 6) NOT NULL,
  item_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_unit, to_unit, item_id)
);
CREATE INDEX IF NOT EXISTS idx_unit_conv_from_to ON unit_conversions(from_unit, to_unit);

INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor)
VALUES
  ('kg', 'g', 1000),
  ('g', 'kg', 0.001),
  ('l', 'ml', 1000),
  ('ml', 'l', 0.001),
  ('box', 'ea', 12),
  ('pack', 'g', 500)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 3. BOM Tables
-- ==========================================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);

-- Items
CREATE TABLE IF NOT EXISTS items (
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
CREATE INDEX IF NOT EXISTS idx_items_store ON items(store_id);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(store_id, type);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
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
CREATE INDEX IF NOT EXISTS idx_recipes_output ON recipes(output_item_id);

-- Recipe Items
CREATE TABLE IF NOT EXISTS recipe_items (
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
CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items(recipe_id);

-- Item Options (Additional ingredients for customization)
CREATE TABLE IF NOT EXISTS item_options (
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
CREATE INDEX IF NOT EXISTS idx_item_options_item ON item_options(item_id);

-- ==========================================
-- 4. Inventory & Sales Tables
-- ==========================================

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
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
CREATE INDEX IF NOT EXISTS idx_suppliers_store ON suppliers(store_id);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
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
CREATE INDEX IF NOT EXISTS idx_po_store ON purchase_orders(store_id);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
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
CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
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
CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory(store_id);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
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
CREATE INDEX IF NOT EXISTS idx_inv_trans_store ON inventory_transactions(store_id);

-- Inventory Lots
CREATE TABLE IF NOT EXISTS inventory_lots (
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
CREATE INDEX IF NOT EXISTS idx_lots_store ON inventory_lots(store_id);

-- Physical Counts
CREATE TABLE IF NOT EXISTS physical_counts (
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
CREATE INDEX IF NOT EXISTS idx_pc_store ON physical_counts(store_id);

-- Physical Count Items
CREATE TABLE IF NOT EXISTS physical_count_items (
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
CREATE INDEX IF NOT EXISTS idx_pci_pc ON physical_count_items(physical_count_id);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_number VARCHAR(100),
  channel VARCHAR(50),
  total_amount DECIMAL(10, 2),
  sale_date DATE NOT NULL,
  sale_time TIME,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);

-- Sales Items
CREATE TABLE IF NOT EXISTS sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity DECIMAL(15, 3) NOT NULL,
  unit_price DECIMAL(10, 2),
  options JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sales_items_sale ON sales_items(sale_id);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_store ON expenses(store_id);

-- Invitations (Consolidated Schema)
CREATE TABLE IF NOT EXISTS store_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(store_id, email)
);
CREATE INDEX IF NOT EXISTS idx_invitations_store ON store_invitations(store_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON store_invitations(token);

-- ==========================================
-- 5. RLS Policies
-- ==========================================

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

-- Helper functions for RLS
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

CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
    AND organization_id = org_id
    AND role IN ('owner', 'manager')
  );
END;
$$;

-- Organizations & Stores: Viewable by members
DROP POLICY IF EXISTS "Members can view organizations" ON organizations;
CREATE POLICY "Members can view organizations" ON organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM user_roles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Members can view stores" ON stores;
CREATE POLICY "Members can view stores" ON stores FOR SELECT USING (
  id IN (SELECT store_id FROM user_roles WHERE user_id = auth.uid())
);

-- Users: Viewable by self or co-workers
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Allow users to view profiles of people in the same organization (for staff lists)
DROP POLICY IF EXISTS "Users can view co-workers" ON users;
CREATE POLICY "Users can view co-workers" ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles my_role
    JOIN user_roles other_role ON my_role.store_id = other_role.store_id
    WHERE my_role.user_id = auth.uid()
    AND other_role.user_id = users.id
  )
);

-- User Roles
-- View own roles
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
FOR SELECT USING (user_id = auth.uid());

-- View roles of same organization (for admins/managers to see staff)
DROP POLICY IF EXISTS "Admins can view org roles" ON user_roles;
CREATE POLICY "Admins can view org roles" ON user_roles
FOR SELECT USING (
  is_org_admin(organization_id)
);

-- Business Data Policies (Items, Inventory, Sales, etc.)

-- Items
DROP POLICY IF EXISTS "Members can view items" ON items;
CREATE POLICY "Members can view items" ON items FOR SELECT USING (is_store_member(store_id));

DROP POLICY IF EXISTS "Admins can manage items" ON items;
CREATE POLICY "Admins can manage items" ON items FOR ALL USING (is_store_admin(store_id));

-- Inventory
DROP POLICY IF EXISTS "Members can view inventory" ON inventory;
CREATE POLICY "Members can view inventory" ON inventory FOR SELECT USING (is_store_member(store_id));

DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory;
CREATE POLICY "Admins can manage inventory" ON inventory FOR ALL USING (is_store_admin(store_id));

-- Sales
DROP POLICY IF EXISTS "Members can view sales" ON sales;
CREATE POLICY "Members can view sales" ON sales FOR SELECT USING (is_store_member(store_id));

DROP POLICY IF EXISTS "Admins can manage sales" ON sales;
CREATE POLICY "Admins can manage sales" ON sales FOR ALL USING (is_store_admin(store_id));

-- Expenses
DROP POLICY IF EXISTS "Members can view expenses" ON expenses;
CREATE POLICY "Members can view expenses" ON expenses FOR SELECT USING (is_store_member(store_id));

DROP POLICY IF EXISTS "Admins can manage expenses" ON expenses;
CREATE POLICY "Admins can manage expenses" ON expenses FOR ALL USING (is_store_admin(store_id));

-- Invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON store_invitations;
CREATE POLICY "Admins can manage invitations" ON store_invitations FOR ALL USING (is_store_admin(store_id));

-- ==========================================
-- 6. Functions & Triggers
-- ==========================================

-- Auth Hook: Create public user record on signup (Idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Materialized View for BOM
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_flattened_bom AS
WITH RECURSIVE bom_tree AS (
  SELECT
    r.output_item_id AS product_id,
    ri.input_item_id AS material_id,
    ri.quantity::DECIMAL,
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

CREATE INDEX IF NOT EXISTS idx_mv_bom_product ON mv_flattened_bom(product_id);

-- Helper RPC to refresh BOM MV
CREATE OR REPLACE FUNCTION refresh_mv_flattened_bom()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_flattened_bom;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sale_inventory_deduction ON sales_items;
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

DROP TRIGGER IF EXISTS trg_purchase_receipt_inventory ON purchase_order_items;
CREATE TRIGGER trg_purchase_receipt_inventory
  AFTER UPDATE OF received_quantity ON purchase_order_items
  FOR EACH ROW
  WHEN (OLD.received_quantity IS DISTINCT FROM NEW.received_quantity)
  EXECUTE FUNCTION process_purchase_receipt();

-- Invitation Acceptance Handler (Robust Version)
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record record;
  user_exists boolean;
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- We are triggering BEFORE UPDATE on store_invitations when status changes to 'accepted'
  -- NEW contains the updated invitation record
  
  -- 1. Identify the user (Assuming the user just signed up or logged in with this email)
  -- The trigger context doesn't give us the current auth user easily if triggered by RLS update?
  -- Wait, usually the user accepts invitation via an API call that updates the table.
  -- The API call should set 'accepted_at' = now() and 'status' = 'accepted'.
  
  -- Check if user exists with this email
  SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.email;
  
  IF v_user_id IS NOT NULL THEN
    -- Ensure public.users record exists
    INSERT INTO public.users (id, email, name)
    VALUES (v_user_id, NEW.email, split_part(NEW.email, '@', 1))
    ON CONFLICT (id) DO NOTHING;

    -- Create user_role
    -- Get org id if not present in invitation (for backward compatibility)
    IF NEW.organization_id IS NULL THEN
        SELECT organization_id INTO v_org_id FROM stores WHERE id = NEW.store_id;
    ELSE
        v_org_id := NEW.organization_id;
    END IF;

    INSERT INTO public.user_roles (user_id, organization_id, store_id, role)
    VALUES (v_user_id, v_org_id, NEW.store_id, NEW.role)
    ON CONFLICT (user_id, store_id) DO NOTHING;
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_invitation_accepted ON store_invitations;
CREATE TRIGGER on_invitation_accepted
  BEFORE UPDATE ON store_invitations
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
  EXECUTE PROCEDURE handle_invitation_acceptance();

-- Onboarding RPC (Updated)
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

-- Sample Data Generator (Helper)
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
  
  PERFORM refresh_mv_flattened_bom();
END;
$$;

-- Inventory Helper Functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_count_item(
  p_count_id UUID,
  p_item_id UUID,
  p_counted_quantity DECIMAL,
  p_unit unit_type,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_system_qty DECIMAL;
  v_store_id UUID;
BEGIN
  SELECT store_id INTO v_store_id FROM physical_counts WHERE id = p_count_id;
  
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
    notes = EXCLUDED.notes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    INSERT INTO inventory (store_id, item_id, theoretical_quantity, physical_quantity, last_physical_count_at)
    VALUES (v_store_id, v_item.item_id, v_item.counted_quantity, v_item.counted_quantity, NOW())
    ON CONFLICT (store_id, item_id)
    DO UPDATE SET
      physical_quantity = v_item.counted_quantity,
      theoretical_quantity = v_item.counted_quantity,
      last_physical_count_at = NOW(),
      last_updated_at = NOW();

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unit Conversion Function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Product Cost Calculation Function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Store Function
CREATE OR REPLACE FUNCTION create_store_v2(
  p_organization_id UUID,
  p_store_code TEXT,
  p_store_name TEXT,
  p_store_type TEXT DEFAULT 'bakery'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_store_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Check permissions: User must be an owner or manager of the organization
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id 
    AND organization_id = p_organization_id
    AND role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: You must be an owner or manager to create a store.';
  END IF;

  -- Create Store
  INSERT INTO stores (organization_id, name, code, settings)
  VALUES (p_organization_id, p_store_name, p_store_code, jsonb_build_object('type', p_store_type))
  RETURNING id INTO v_new_store_id;

  -- Create User Role for the creator (as owner of this store)
  INSERT INTO user_roles (user_id, organization_id, store_id, role)
  VALUES (v_user_id, p_organization_id, v_new_store_id, 'owner');

  -- Create basic categories for the new store
  INSERT INTO categories (store_id, name) VALUES (v_new_store_id, '기본');

  RETURN json_build_object(
    'store_id', v_new_store_id,
    'created', true
  );
END;
$$;

-- ==========================================
-- 7. Permissions
-- ==========================================

-- Grant usage on schema to standard roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure future objects get these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;