-- Add accepted_at column to store_invitations
ALTER TABLE public.store_invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;

-- Fix handle_invitation_acceptance trigger (column names)
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record record;
  user_exists boolean;
  v_org_id UUID;
BEGIN
  -- Check if there's a pending invitation for this email
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
      -- Fix: Use 'name' instead of 'full_name'
      INSERT INTO public.users (id, email, name, avatar_url)
      VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), 
        NEW.raw_user_meta_data->>'avatar_url'
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Get organization_id from store
    SELECT organization_id INTO v_org_id
    FROM public.stores
    WHERE id = invitation_record.store_id;

    -- Create user_role with organization_id
    INSERT INTO public.user_roles (user_id, organization_id, store_id, role)
    VALUES (NEW.id, v_org_id, invitation_record.store_id, invitation_record.role);

    -- Update invitation status (now accepted_at exists)
    UPDATE public.store_invitations
    SET status = 'accepted',
        accepted_at = now()
    WHERE id = invitation_record.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;