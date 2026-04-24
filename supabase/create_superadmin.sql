-- Create Super Admin User - SECURE VERSION
-- This script requires SERVICE ROLE access and should only be run by database administrators
-- DO NOT run this with regular user credentials

-- IMPORTANT SECURITY NOTES:
-- 1. This script should only be executed by trusted administrators
-- 2. Never expose service role keys to client applications
-- 3. Regular users cannot escalate their privileges through profile updates
-- 4. Profiles are created automatically via database trigger on user signup
-- 5. For production, use the promote_to_super_admin() function instead

-- SECURE METHOD 1: Direct SQL (requires service role)
-- Replace 'user-uuid-here' with the actual user UUID from auth.users
UPDATE profiles
SET org_id = 'super-admin', role = 'owner'
WHERE id = 'user-uuid-here';

-- SECURE METHOD 2: Using the secure function (from Edge Function)
-- SELECT promote_to_super_admin('user-uuid-here');

-- VERIFICATION: Check that the user now has super admin privileges
-- SELECT id, org_id, role, full_name FROM profiles WHERE org_id = 'super-admin';

-- NEVER allow this operation through client-side code or user-initiated requests
-- This must be done manually by a database administrator with service role access
-- or through a secure server-side Edge Function