-- Drop the previous trigger to fix ordering issue and rename it
DROP TRIGGER IF EXISTS on_auth_user_created_invitation ON auth.users;

-- Update the function to be more robust
CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_org_id UUID;
BEGIN
  -- 1. Check if the user is already created (this trigger runs after insert, so NEW is the user)
  -- 2. Check for invitation by email (case insensitive)
  SELECT * INTO v_invitation
  FROM public.store_invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation IS NOT NULL THEN
    -- Get Organization ID
    SELECT organization_id INTO v_org_id 
    FROM public.stores 
    WHERE id = v_invitation.store_id;

    IF v_org_id IS NULL THEN
        RAISE WARNING 'Organization ID not found for store %', v_invitation.store_id;
        -- Don't fail the user creation, just skip role assignment
        RETURN NEW;
    END IF;

    -- Assign role
    -- public.user_roles references public.users(id). 
    -- We assume public.users row exists. 
    -- If this trigger runs after handle_new_user, it should exist.
    BEGIN
        INSERT INTO public.user_roles (user_id, organization_id, store_id, role)
        VALUES (
            NEW.id, 
            v_org_id, 
            v_invitation.store_id, 
            v_invitation.role
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to assign role from invitation: %', SQLERRM;
        -- Don't fail the user creation
        RETURN NEW;
    END;

    -- Update invitation status
    UPDATE public.store_invitations
    SET status = 'accepted'
    WHERE id = v_invitation.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger with a name that ensures it runs AFTER 'on_auth_user_created'
-- 'z_' comes after 'o'
CREATE TRIGGER z_handle_invitation_acceptance
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_invitation_acceptance();