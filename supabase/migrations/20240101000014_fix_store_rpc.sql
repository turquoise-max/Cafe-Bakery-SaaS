-- Create a function to fix/create store for a user atomically
CREATE OR REPLACE FUNCTION fix_user_store(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_store_id UUID;
  v_role_id UUID;
  v_org_slug TEXT;
  v_store_code TEXT;
  v_existing_role RECORD;
BEGIN
  -- 1. Ensure user exists in public.users
  INSERT INTO public.users (id, email, name)
  VALUES (p_user_id, p_email, p_name)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(public.users.name, EXCLUDED.name);

  -- 2. Check if user already has a role (and thus a store)
  SELECT * INTO v_existing_role
  FROM user_roles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already has a store',
      'store_id', v_existing_role.store_id,
      'organization_id', v_existing_role.organization_id,
      'role', v_existing_role.role
    );
  END IF;

  -- 3. Create Organization
  v_org_slug := 'org-' || substring(p_user_id::text from 1 for 8) || '-' || extract(epoch from now())::bigint;
  
  INSERT INTO organizations (name, slug, subscription_plan)
  VALUES (split_part(p_email, '@', 1) || '''s Org', v_org_slug, 'trial')
  RETURNING id INTO v_org_id;

  -- 4. Create Store
  v_store_code := 'STORE-' || substring(extract(epoch from now())::text from 1 for 8);

  INSERT INTO stores (organization_id, name, code, is_active)
  VALUES (v_org_id, split_part(p_email, '@', 1) || '''s Store', v_store_code, true)
  RETURNING id INTO v_store_id;

  -- 5. Create User Role
  INSERT INTO user_roles (user_id, organization_id, store_id, role)
  VALUES (p_user_id, v_org_id, v_store_id, 'owner')
  RETURNING id INTO v_role_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Store created successfully',
    'organization_id', v_org_id,
    'store_id', v_store_id,
    'role_id', v_role_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;