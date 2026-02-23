-- Create Store Function (Updated to support address and phone)
CREATE OR REPLACE FUNCTION create_store_v2(
  p_organization_id UUID,
  p_store_code TEXT,
  p_store_name TEXT,
  p_store_type TEXT DEFAULT 'bakery',
  p_address TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
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
  INSERT INTO stores (organization_id, name, code, settings, address, phone)
  VALUES (
    p_organization_id, 
    p_store_name, 
    p_store_code, 
    jsonb_build_object('type', p_store_type),
    p_address,
    p_phone
  )
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