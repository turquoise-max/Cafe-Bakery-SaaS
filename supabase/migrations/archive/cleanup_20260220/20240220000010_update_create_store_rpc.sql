-- Update create_store_v2 to accept address and phone
CREATE OR REPLACE FUNCTION create_store_v2(
  p_organization_id UUID,
  p_store_name TEXT,
  p_store_code TEXT,
  p_store_type JSONB,
  p_address TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_new_store_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate Organization Ownership
  IF NOT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = v_user_id 
      AND organization_id = p_organization_id 
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Permission denied: You must be an owner of the organization to create a store.';
  END IF;

  -- Create the Store
  INSERT INTO stores (
    organization_id,
    name,
    code,
    settings,
    address,
    phone
  ) VALUES (
    p_organization_id,
    p_store_name,
    p_store_code,
    p_store_type,
    p_address,
    p_phone
  )
  RETURNING id INTO v_new_store_id;

  -- Assign Owner Role
  INSERT INTO user_roles (
    user_id,
    organization_id,
    store_id,
    role
  ) VALUES (
    v_user_id,
    p_organization_id,
    v_new_store_id,
    'owner'
  );

  RETURN v_new_store_id;
END;
$$;