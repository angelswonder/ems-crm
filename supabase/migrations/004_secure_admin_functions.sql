-- Secure Super Admin Promotion Function
-- This function can be called from Edge Functions with proper authentication

CREATE OR REPLACE FUNCTION promote_to_super_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Only allow super admins to promote others
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role != 'owner' OR (SELECT org_id FROM profiles WHERE id = auth.uid()) != 'super-admin' THEN
    RAISE EXCEPTION 'Access denied: Only super admins can promote users';
  END IF;

  -- Promote the user
  UPDATE profiles
  SET org_id = 'super-admin', role = 'owner'
  WHERE id = user_uuid;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users (the function checks permissions internally)
GRANT EXECUTE ON FUNCTION promote_to_super_admin(UUID) TO authenticated;