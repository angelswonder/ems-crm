-- Secure Super Admin Promotion Function
-- This function can be called from Edge Functions with proper authentication

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

CREATE OR REPLACE FUNCTION promote_to_super_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
  current_user_is_super_admin BOOLEAN;
BEGIN
  -- Only allow super admins to promote others
  SELECT role, is_super_admin INTO current_user_role, current_user_is_super_admin
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role != 'owner' OR current_user_is_super_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Access denied: Only super admins can promote users';
  END IF;

  -- Promote the user
  UPDATE profiles
  SET is_super_admin = TRUE,
      role = 'owner'
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