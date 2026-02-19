-- Function to create initial organization and store in a transaction
DROP FUNCTION IF EXISTS create_initial_organization(TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_initial_organization(
  org_name TEXT,
  store_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  new_store_id UUID;
  new_role_id UUID;
  user_id UUID;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Create Organization
  INSERT INTO organizations (name, slug)
  VALUES (org_name, lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(random() * 10000)::text)
  RETURNING id INTO new_org_id;

  -- 2. Create Store
  INSERT INTO stores (organization_id, name, code)
  VALUES (new_org_id, store_name, upper(substring(store_name, 1, 3)) || floor(random() * 1000)::text)
  RETURNING id INTO new_store_id;

  -- 3. Create User Role (Owner)
  INSERT INTO user_roles (user_id, organization_id, store_id, role)
  VALUES (user_id, new_org_id, new_store_id, 'owner')
  RETURNING id INTO new_role_id;

  -- Return success
  RETURN json_build_object(
    'organization_id', new_org_id,
    'store_id', new_store_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;