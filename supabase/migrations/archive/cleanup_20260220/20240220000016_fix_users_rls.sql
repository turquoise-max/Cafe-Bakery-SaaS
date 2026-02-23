-- Allow users to view profiles of other members in the same store/organization
-- This is needed for displaying "invited by" information and staff lists

CREATE POLICY "Users can view co-workers" ON users FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles my_roles
    JOIN user_roles other_roles ON my_roles.store_id = other_roles.store_id
    WHERE my_roles.user_id = auth.uid()
    AND other_roles.user_id = users.id
  )
);