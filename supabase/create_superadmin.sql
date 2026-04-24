-- Create Super Admin User
-- Run this in Supabase SQL Editor to create a super admin account
-- Replace 'superadmin@example.com' and 'password123' with actual credentials

-- First, create the user in auth.users (this will be done via signup, but for manual creation)
-- Note: You can't directly insert into auth.users via SQL. Use the signup flow or Supabase dashboard.

-- After the user signs up with email 'superadmin@example.com', run this to set their profile:

INSERT INTO profiles (id, org_id, full_name, role, email)
SELECT
  id,
  'super-admin',
  'Super Administrator',
  'owner',
  email
FROM auth.users
WHERE email = 'superadmin@example.com'
ON CONFLICT (id) DO UPDATE SET
  org_id = 'super-admin',
  role = 'owner',
  full_name = 'Super Administrator';

-- Alternative: If you have the user ID, replace 'user-uuid-here' with the actual UUID:

-- INSERT INTO profiles (id, org_id, full_name, role, email) VALUES
-- ('user-uuid-here', 'super-admin', 'Super Administrator', 'owner', 'superadmin@example.com')
-- ON CONFLICT (id) DO UPDATE SET
--   org_id = 'super-admin',
--   role = 'owner',
--   full_name = 'Super Administrator';