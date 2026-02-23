-- Fix ambiguous column reference in RLS functions and add missing INSERT policies

-- 1. Fix ambiguous column references by using explicit table aliases and function parameter references.
-- Note: We CANNOT change the parameter name (e.g. to p_store_id) with CREATE OR REPLACE in Postgres.
-- So we keep 'store_id' but resolve ambiguity in the query.

CREATE OR REPLACE FUNCTION is_store_member(store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    -- Explicitly refer to the function parameter using the function name
    AND ur.store_id = is_store_member.store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_store_admin(store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    -- Explicitly refer to the function parameter using the function name
    AND ur.store_id = is_store_admin.store_id
    AND ur.role IN ('owner', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Add INSERT policies for stores and user_roles to allow creating additional stores

-- Allow Organization Owners to create new stores
DROP POLICY IF EXISTS "Owners can create stores" ON stores;
CREATE POLICY "Owners can create stores"
ON stores FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'owner'
  )
);

-- Allow Organization Owners to assign roles (when creating new stores or inviting users)
DROP POLICY IF EXISTS "Owners can assign roles" ON user_roles;
CREATE POLICY "Owners can assign roles"
ON user_roles FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'owner'
  )
);