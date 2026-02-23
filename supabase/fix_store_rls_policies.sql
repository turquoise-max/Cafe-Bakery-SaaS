-- Enable RLS on stores (just in case)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can update stores" ON stores;
DROP POLICY IF EXISTS "Owners can delete stores" ON stores;

-- Create UPDATE policy
-- Allows owners and managers to update store details
CREATE POLICY "Admins can update stores"
ON stores FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND (
      -- Case 1: Organization Admin (store_id is null, role applies to all stores in org)
      (user_roles.organization_id = stores.organization_id AND user_roles.role IN ('owner', 'manager'))
      OR
      -- Case 2: Store Admin (store_id matches, role applies to specific store)
      (user_roles.store_id = stores.id AND user_roles.role IN ('owner', 'manager'))
    )
  )
);

-- Create DELETE policy
-- Allows owners to delete stores
CREATE POLICY "Owners can delete stores"
ON stores FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND (
      -- Case 1: Organization Owner
      (user_roles.organization_id = stores.organization_id AND user_roles.role = 'owner')
      OR
      -- Case 2: Store Owner
      (user_roles.store_id = stores.id AND user_roles.role = 'owner')
    )
  )
);