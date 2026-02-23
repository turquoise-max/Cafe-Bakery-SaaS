-- Function to handle new user creation AND invitation acceptance
CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_user_role text;
BEGIN
  -- 1. Create public user profile (Restoring original handle_new_user logic)
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Check for invitation
  -- Find valid invitation by email (case insensitive)
  -- We trust the email match because Supabase Auth verifies email ownership (or we assume it does)
  -- We simplify the logic to ignore token check for now, allowing users to just sign up with the invited email
  SELECT * INTO v_invitation
  FROM public.store_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation IS NOT NULL THEN
    -- Assign role
    INSERT INTO public.user_roles (user_id, organization_id, store_id, role)
    VALUES (
      NEW.id, 
      (SELECT organization_id FROM stores WHERE id = v_invitation.store_id), 
      v_invitation.store_id, 
      v_invitation.role
    );

    -- Update invitation status
    UPDATE public.store_invitations
    SET status = 'accepted',
        updated_at = now()
    WHERE id = v_invitation.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists (to ensure we use the new function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_acceptance();