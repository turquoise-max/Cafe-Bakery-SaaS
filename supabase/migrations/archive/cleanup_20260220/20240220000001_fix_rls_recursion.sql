-- Fix infinite recursion in user_roles RLS policy

-- Drop problematic policy that caused infinite recursion
DROP POLICY IF EXISTS "Members can view roles" ON user_roles;

-- Create simplified policy: Users can only view their own roles directly via API
-- For checking other users' roles, we should use SECURITY DEFINER functions
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Ensure store_invitations has correct policy and permissions
-- Drop existing policy if any (to be safe and ensure clean state)
DROP POLICY IF EXISTS "Admins can manage invitations" ON store_invitations;

-- Re-create policy using the existing is_store_admin function
-- Note: is_store_admin is SECURITY DEFINER, so it bypasses RLS on user_roles, avoiding recursion
CREATE POLICY "Admins can manage invitations"
ON store_invitations
FOR ALL
USING (is_store_admin(store_id));

-- Add policy for users to view invitations sent to their email (for accepting invites later)
-- Note: This assumes the user's email in auth.users matches the invitation email
DROP POLICY IF EXISTS "Users can view invitations for their email" ON store_invitations;

CREATE POLICY "Users can view invitations for their email"
ON store_invitations FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));