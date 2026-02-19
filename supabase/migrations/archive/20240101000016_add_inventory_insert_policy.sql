-- Helper function to check store access (ensure it exists)
CREATE OR REPLACE FUNCTION public.has_store_access(target_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND store_id = target_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add INSERT policy for inventory table
CREATE POLICY "Users can insert inventory in their stores"
ON inventory FOR INSERT
WITH CHECK (public.has_store_access(store_id));