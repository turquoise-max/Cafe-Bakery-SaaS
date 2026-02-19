-- Extended onboarding with store type and sample data support

-- 1. Create a function to generate sample data
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
  v_category_coffee_id UUID;
  v_category_bread_id UUID;
  v_category_raw_id UUID;
  v_item_flour_id UUID;
  v_item_butter_id UUID;
  v_item_croissant_id UUID;
  v_recipe_id UUID;
BEGIN
  -- Create Categories
  INSERT INTO categories (store_id, name, display_order)
  VALUES (p_store_id, '커피/음료', 1)
  RETURNING id INTO v_category_coffee_id;

  INSERT INTO categories (store_id, name, display_order)
  VALUES (p_store_id, '베이커리', 2)
  RETURNING id INTO v_category_bread_id;
  
  INSERT INTO categories (store_id, name, display_order)
  VALUES (p_store_id, '원자재', 99)
  RETURNING id INTO v_category_raw_id;

  -- Create Raw Materials (Items)
  INSERT INTO items (store_id, name, code, type, category_id, base_unit, purchase_unit, latest_purchase_price, safety_stock)
  VALUES 
    (p_store_id, '박력분', 'RAW-001', 'raw', v_category_raw_id, 'g', 'kg', 0.005, 5000)
  RETURNING id INTO v_item_flour_id;

  INSERT INTO items (store_id, name, code, type, category_id, base_unit, purchase_unit, latest_purchase_price, safety_stock)
  VALUES 
    (p_store_id, '버터', 'RAW-002', 'raw', v_category_raw_id, 'g', 'kg', 0.015, 2000)
  RETURNING id INTO v_item_butter_id;

  -- Create Finished Product (Items)
  INSERT INTO items (store_id, name, code, type, category_id, base_unit, sale_price, is_inventory_managed)
  VALUES 
    (p_store_id, '크로와상', 'BAKE-001', 'finished', v_category_bread_id, 'ea', 4500, true)
  RETURNING id INTO v_item_croissant_id;

  -- Create Recipe (BOM)
  INSERT INTO recipes (store_id, output_item_id, output_quantity, version, is_active, name)
  VALUES 
    (p_store_id, v_item_croissant_id, 1, 1, true, '기본 크로와상 레시피')
  RETURNING id INTO v_recipe_id;

  -- Create Recipe Items
  INSERT INTO recipe_items (recipe_id, input_item_id, quantity, unit)
  VALUES 
    (v_recipe_id, v_item_flour_id, 50, 'g'),
    (v_recipe_id, v_item_butter_id, 30, 'g');

  -- Initial Inventory (Optional)
  INSERT INTO inventory (store_id, item_id, theoretical_quantity)
  VALUES 
    (p_store_id, v_item_flour_id, 20000), -- 20kg
    (p_store_id, v_item_butter_id, 10000), -- 10kg
    (p_store_id, v_item_croissant_id, 10); -- 10ea

END;
$$;

-- 2. Create create_initial_organization_v2 to accept new parameters
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
  v_new_role_id UUID;
  v_user_id UUID;
  v_existing_role RECORD;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure user exists in public.users (Idempotent insert)
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'name', email),
    created_at, 
    updated_at
  FROM auth.users
  WHERE id = v_user_id
  ON CONFLICT (id) DO NOTHING;

  -- Check if user already has a role (idempotency check)
  SELECT * INTO v_existing_role 
  FROM user_roles ur
  WHERE ur.user_id = v_user_id 
  LIMIT 1;
  
  IF FOUND THEN
    RETURN json_build_object(
      'organization_id', v_existing_role.organization_id,
      'store_id', v_existing_role.store_id,
      'already_exists', true
    );
  END IF;

  -- 1. Create Organization
  INSERT INTO organizations (name, slug)
  VALUES (
    p_org_name, 
    lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(random() * 10000)::text
  )
  RETURNING id INTO v_new_org_id;

  -- 2. Create Store with store_type in settings
  INSERT INTO stores (organization_id, name, code, settings)
  VALUES (
    v_new_org_id, 
    p_store_name, 
    upper(substring(p_store_name, 1, 3)) || floor(random() * 1000)::text,
    jsonb_build_object('type', p_store_type)
  )
  RETURNING id INTO v_new_store_id;

  -- 3. Create User Role (Owner)
  INSERT INTO user_roles (user_id, organization_id, store_id, role)
  VALUES (v_user_id, v_new_org_id, v_new_store_id, 'owner')
  RETURNING id INTO v_new_role_id;

  -- 4. Create Sample Data if requested
  IF p_include_sample_data THEN
    PERFORM create_sample_data(v_new_store_id, p_store_type);
  END IF;

  -- Return success
  RETURN json_build_object(
    'organization_id', v_new_org_id,
    'store_id', v_new_store_id,
    'created', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;