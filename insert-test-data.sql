-- ============================================================================
-- Direct Database Insertion Script for Testing
-- Run this in Supabase SQL Editor (requires service role access)
-- ============================================================================

-- Generate unique identifiers
-- The timestamps ensure unique slugs and names

-- Insert test organization
INSERT INTO organizations (
  id,
  name,
  slug,
  plan_type,
  subscription_status,
  billing_email,
  created_at,
  updated_at
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Test Development Company',
  'test-dev-company-2026',
  'free',
  'active',
  'billing@testcompany.com',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Insert test auth user (this creates the user in auth.users table)
-- NOTE: You may need to run this in the Supabase Auth section instead
-- For now, we'll assume the user exists. If not, create via Supabase dashboard

-- Insert test profile linked to organization
INSERT INTO profiles (
  id,
  org_id,
  full_name,
  email,
  role,
  is_super_admin,
  theme_preference,
  email_notifications,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'John Developer',
  'john@testcompany.com',
  'owner',
  false,
  'dark',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  org_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  full_name = 'John Developer',
  email = 'john@testcompany.com',
  role = 'owner',
  updated_at = NOW();

-- Verify insertion
SELECT 'Organization created:' as status;
SELECT id, name, slug, plan_type FROM organizations WHERE slug = 'test-dev-company-2026';

SELECT 'Profile created:' as status;
SELECT id, org_id, full_name, email, role FROM profiles WHERE email = 'john@testcompany.com';
