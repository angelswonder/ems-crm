-- Create Super Admin User - SECURE VERSION
-- This script requires SERVICE ROLE access and should only be run by database administrators
-- DO NOT run this with regular user credentials
-- NOTE: This script assumes the profiles table already exists from earlier schema migrations.

-- IMPORTANT SECURITY NOTES:
-- 1. This script should only be executed by trusted administrators
-- 2. Never expose service role keys to client applications
-- 3. Regular users cannot escalate their privileges through profile updates
-- 4. Profiles are created automatically via database trigger on user signup
-- 5. For production, use the promote_to_super_admin() Edge Function instead

-- ============================================================================
-- STEP 1: FIND A USER TO PROMOTE
-- ============================================================================

-- First, check what users exist in auth.users (requires service role)
-- You can run this in Supabase SQL Editor with service role key:
-- SELECT id, email, created_at, raw_user_meta_data FROM auth.users ORDER BY created_at DESC;

-- Or use the Edge Function to list users (if you have the user-management function):
-- curl -X GET 'https://your-project.supabase.co/functions/v1/user-management/users' \
--   -H 'Authorization: Bearer YOUR_ANON_KEY'

-- ============================================================================
-- STEP 2: PROMOTE USER TO SUPER ADMIN
-- ============================================================================

-- SECURE METHOD 1: Direct SQL (requires service role)
-- Replace 'user-uuid-here' with the actual user UUID from auth.users
-- UPDATE profiles
-- SET org_id = 'super-admin', role = 'owner', updated_at = NOW()
-- WHERE id = 'user-uuid-here';

-- SECURE METHOD 2: Using the Edge Function (recommended for production)
-- Deploy the promote-superadmin function first, then call it:
-- curl -X POST 'https://your-project.supabase.co/functions/v1/promote-superadmin' \
--   -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
--   -H 'Content-Type: application/json' \
--   -d '{"user_id": "user-uuid-here"}'

-- ============================================================================
-- STEP 3: VERIFY SUPER ADMIN STATUS
-- ============================================================================

-- Check that the user now has super admin privileges
-- SELECT id, org_id, role, full_name, email FROM profiles WHERE org_id = 'super-admin';

-- ============================================================================
-- STEP 4: TEST SUPER ADMIN ACCESS
-- ============================================================================

-- Test that the super admin can access all organizations:
-- SELECT * FROM organizations LIMIT 5;  -- Should work for super admin

-- Test that super admin can update any organization:
-- UPDATE organizations SET plan_type = 'enterprise' WHERE id = 'some-org-id';

-- ============================================================================
-- SECURITY REMINDERS
-- ============================================================================

-- NEVER allow this operation through client-side code or user-initiated requests
-- This must be done manually by a database administrator with service role access
-- or through a secure server-side Edge Function

-- Super admin users have access to:
-- - All organizations and their data
-- - All user profiles
-- - Billing and subscription management
-- - System-wide audit logs
-- - Force plan upgrades/downgrades

-- Use extreme caution when granting super admin privileges!