-- Create a secure RPC function to create a store
-- This function handles permission checks and transactional inserts for stores and user_roles

CREATE OR REPLACE FUNCTION create_store_v2(
  p_organization_id UUID,
  p_store_name TEXT,
  p_store_code TEXT,
  p_store_type JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the privileges of the function creator (usually postgres/superuser)
AS $$
DECLARE
  v_user_id UUID;
  v_new_store_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- 1. Validate User Authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Validate Organization Ownership
  -- Check if the current user has the 'owner' role for the specified organization
  IF NOT EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = v_user_id 
      AND organization_id = p_organization_id 
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Permission denied: You must be an owner of the organization to create a store.';
  END IF;

  -- 3. Create the Store
  INSERT INTO stores (
    organization_id,
    name,
    code,
    settings
  ) VALUES (
    p_organization_id,
    p_store_name,
    p_store_code,
    p_store_type -- Assuming p_store_type is passed as JSONB like '{"type": "cafe"}'
  )
  RETURNING id INTO v_new_store_id;

  -- 4. Assign Owner Role for the New Store
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

  -- Return the new store ID
  RETURN v_new_store_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_store_v2 TO authenticated;