-- Function to get organization IDs for the current user
-- SECURITY DEFINER ensures this runs with elevated privileges to bypass infinite recursion in policies
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id
  FROM user_roles
  WHERE user_id = auth.uid();
END;
$$;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can view stores in their organizations" ON stores;
DROP POLICY IF EXISTS "Users can view roles in their organizations" ON user_roles;

-- Organizations Policy
CREATE POLICY "Users can view organizations they belong to"
ON organizations FOR SELECT
USING (
  id IN (SELECT public.get_my_org_ids())
);

-- Stores Policy
CREATE POLICY "Users can view stores in their organizations"
ON stores FOR SELECT
USING (
  organization_id IN (SELECT public.get_my_org_ids())
);

-- User Roles Policy (Secondary - viewing other roles in same org)
CREATE POLICY "Users can view roles in their organizations"
ON user_roles FOR SELECT
USING (
  organization_id IN (SELECT public.get_my_org_ids())
);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO service_role;