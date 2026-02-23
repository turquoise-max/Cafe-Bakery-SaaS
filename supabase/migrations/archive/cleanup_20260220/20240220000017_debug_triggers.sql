-- Create a debug log table
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update handle_invitation_acceptance to log progress
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record record;
  user_exists boolean;
  v_org_id UUID;
BEGIN
  INSERT INTO public.debug_logs (message, details) VALUES ('handle_invitation_acceptance start', jsonb_build_object('email', NEW.email, 'id', NEW.id));

  -- Check if there's a pending invitation for this email
  SELECT * INTO invitation_record
  FROM public.store_invitations
  WHERE lower(email) = lower(NEW.email)
    AND status = 'pending'
    AND (expires_at > now() OR expires_at IS NULL)
  LIMIT 1;

  IF invitation_record.id IS NULL THEN
    INSERT INTO public.debug_logs (message, details) VALUES ('No pending invitation found', jsonb_build_object('email', NEW.email));
    RETURN NEW;
  END IF;

  INSERT INTO public.debug_logs (message, details) VALUES ('Invitation found', row_to_json(invitation_record)::jsonb);

  -- Ensure public.users record exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;
  
  IF NOT user_exists THEN
    INSERT INTO public.debug_logs (message) VALUES ('User does not exist in public.users, creating...');
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
      NEW.id, 
      NEW.email, 
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.debug_logs (message) VALUES ('User exists in public.users');
  END IF;

  -- Get organization_id from store
  SELECT organization_id INTO v_org_id
  FROM public.stores
  WHERE id = invitation_record.store_id;

  IF v_org_id IS NULL THEN
    INSERT INTO public.debug_logs (message, details) VALUES ('Organization ID not found for store', jsonb_build_object('store_id', invitation_record.store_id));
    -- This might cause failure if we proceed, but let's see.
  END IF;

  INSERT INTO public.debug_logs (message, details) VALUES ('Found org_id', jsonb_build_object('org_id', v_org_id));

  -- Create user_role with organization_id
  BEGIN
    INSERT INTO public.user_roles (user_id, organization_id, store_id, role)
    VALUES (NEW.id, v_org_id, invitation_record.store_id, invitation_record.role);
    INSERT INTO public.debug_logs (message) VALUES ('User role created');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.debug_logs (message, details) VALUES ('Error creating user_role', jsonb_build_object('error', SQLERRM));
    RAISE; -- Re-raise error to abort transaction
  END;

  -- Update invitation status
  UPDATE public.store_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = invitation_record.id;
  
  INSERT INTO public.debug_logs (message) VALUES ('Invitation accepted');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.debug_logs (message, details) VALUES ('Unhandled error in trigger', jsonb_build_object('error', SQLERRM));
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;