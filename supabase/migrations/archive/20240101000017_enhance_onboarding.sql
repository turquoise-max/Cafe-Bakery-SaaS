-- Enhance create_initial_organization function to ensure user exists in public.users
-- This fixes issues where auth trigger might fail or delay, causing foreign key violations or RLS policy failures

CREATE OR REPLACE FUNCTION create_initial_organization(
  p_org_name TEXT,
  p_store_name TEXT
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
  v_user_email TEXT;
  v_user_name TEXT;
  v_existing_role RECORD;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure user exists in public.users (Idempotent insert)
  -- This fixes the issue where auth trigger might have failed or delayed
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

  -- 2. Create Store
  INSERT INTO stores (organization_id, name, code)
  VALUES (
    v_new_org_id, 
    p_store_name, 
    upper(substring(p_store_name, 1, 3)) || floor(random() * 1000)::text
  )
  RETURNING id INTO v_new_store_id;

  -- 3. Create User Role (Owner)
  INSERT INTO user_roles (user_id, organization_id, store_id, role)
  VALUES (v_user_id, v_new_org_id, v_new_store_id, 'owner')
  RETURNING id INTO v_new_role_id;

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