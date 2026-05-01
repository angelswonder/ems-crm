-- Fix Auth and RLS policies for organization and individual user support
-- Run this after migrations 001, 002, and 003

-- ============================================================================
-- 1. ENSURE PROFILES TABLE ALLOWS PROPER UPSERTS
-- ============================================================================

-- Add missing columns if needed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Ensure org_id can be null
ALTER TABLE profiles ALTER COLUMN org_id DROP NOT NULL;

-- Drop overly restrictive constraints and re-add with proper logic
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('owner', 'admin', 'member', 'viewer', 'manager')
);

-- ============================================================================
-- 2. UPDATE RLS POLICIES FOR PROFILES TABLE
-- ============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization or their own profile" ON profiles;

-- Create unified SELECT policy that handles both org and individual users
CREATE POLICY "Users can view own profile or org profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid()  -- Always see own profile
    OR org_id IS NOT NULL AND org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())  -- See org members
  );

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile (limited fields)" ON profiles;

-- Create unified UPDATE policy
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create unified INSERT policy - allow any authenticated user to insert their profile
-- This is needed because auth triggers will create profiles
CREATE POLICY "Authenticated users can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 3. UPDATE RLS POLICIES FOR ORGANIZATIONS TABLE
-- ============================================================================

-- Ensure organizations table has RLS enabled
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate SELECT policy
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id = (SELECT org_id FROM profiles WHERE id = auth.uid() AND org_id IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND org_id = organizations.id 
      AND role IN ('owner', 'admin')
    )
  );

-- Drop and recreate INSERT policy - allow authenticated users to create orgs
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Only organization owner can update" ON organizations;
CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = organizations.id 
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- 4. IMPROVE AUTH TRIGGER FOR PROFILE CREATION
-- ============================================================================

-- Update the create_user_profile trigger to handle errors better and log them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_type TEXT;
  org_id_value UUID;
BEGIN
  -- Extract user_type from metadata
  user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'individual');
  
  -- For individual users, org_id should be NULL
  -- For org users, org_id should be NULL until createOrganization is called
  org_id_value := NULL;
  
  -- Try to create profile, but don't fail if it already exists
  BEGIN
    INSERT INTO profiles (
      id, 
      org_id, 
      full_name, 
      role, 
      email,
      theme_preference,
      email_notifications
    )
    VALUES (
      NEW.id,
      org_id_value,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
      CASE 
        WHEN user_type = 'individual' THEN 'manager'
        ELSE 'member'  -- Org users start as members, set to owner during org creation
      END,
      NEW.email,
      'dark',
      true
    );
  EXCEPTION WHEN unique_violation THEN
    -- Profile already exists, that's okay
    NULL;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Failed to create profile for user % (email %): %', NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- ============================================================================
-- 5. ENSURE COLUMN DEFAULTS ARE SET
-- ============================================================================

ALTER TABLE profiles ALTER COLUMN theme_preference SET DEFAULT 'dark';
ALTER TABLE profiles ALTER COLUMN email_notifications SET DEFAULT true;

-- ============================================================================
-- 6. GRANT PROPER PERMISSIONS
-- ============================================================================

-- Ensure authenticated users can select and update their own profiles
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- Ensure the trigger function can operate with elevated privileges
ALTER FUNCTION create_user_profile() SECURITY DEFINER;

-- Allow trigger to have access needed to insert profiles
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON TABLE profiles TO postgres;
GRANT ALL PRIVILEGES ON TABLE organizations TO postgres;
