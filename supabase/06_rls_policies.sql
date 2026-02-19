3-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy helper function
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations Policies
CREATE POLICY "Users can view organizations they belong to"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
);

-- Stores Policies
CREATE POLICY "Users can view stores in their organizations"
ON stores FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
);

-- User Roles Policies
CREATE POLICY "Users can view their own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can view roles in their organizations"
ON user_roles FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
  )
);

-- Function to create initial organization, store, and owner role transactionally
CREATE OR REPLACE FUNCTION create_initial_organization(
  org_name TEXT,
  store_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  new_store_id UUID;
  new_role_id UUID;
  current_user_id UUID;
  org_slug TEXT;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate slug
  org_slug := 'org-' || floor(extract(epoch from now())) || '-' || substring(md5(random()::text) from 1 for 5);

  -- 1. Create Organization
  INSERT INTO organizations (name, slug, subscription_plan)
  VALUES (org_name, org_slug, 'trial')
  RETURNING id INTO new_org_id;

  -- 2. Create Store
  INSERT INTO stores (organization_id, name, code)
  VALUES (new_org_id, store_name, 'MAIN')
  RETURNING id INTO new_store_id;

  -- 3. Create User Role (Owner)
  INSERT INTO user_roles (user_id, organization_id, store_id, role)
  VALUES (current_user_id, new_org_id, new_store_id, 'owner')
  RETURNING id INTO new_role_id;

  -- Return the created IDs
  RETURN jsonb_build_object(
    'organization_id', new_org_id,
    'store_id', new_store_id
  );
END;
$$;