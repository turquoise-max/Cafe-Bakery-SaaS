-- Update the handle_invitation_acceptance function to be more robust
-- It ensures public.users record exists before trying to assign a role

CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record record;
  user_exists boolean;
BEGIN
  -- Check if there's a pending invitation for this email
  -- Using lower() for case-insensitive comparison
  SELECT * INTO invitation_record
  FROM public.store_invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND (expires_at > now() OR expires_at IS NULL)
  LIMIT 1;

  -- If invitation found
  IF invitation_record.id IS NOT NULL THEN
    
    -- Ensure public.users record exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;
    
    IF NOT user_exists THEN
      -- If public.users record doesn't exist (e.g. handle_new_user trigger hasn't run yet or failed),
      -- create it now to satisfy foreign key constraint
      INSERT INTO public.users (id, email, full_name, avatar_url)
      VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'avatar_url'
      );
    END IF;

    -- Create user_role
    INSERT INTO public.user_roles (user_id, store_id, role)
    VALUES (NEW.id, invitation_record.store_id, invitation_record.role);

    -- Update invitation status
    UPDATE public.store_invitations
    SET status = 'accepted',
        accepted_at = now()
    WHERE id = invitation_record.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;