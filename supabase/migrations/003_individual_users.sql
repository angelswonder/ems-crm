-- Update profiles table to support individual users
-- Run this after 002_saas_schema.sql
-- NOTE: This migration requires the profiles table to already exist.
-- If you see "relation \"profiles\" does not exist", run 002_saas_schema.sql first.

-- Allow org_id to be null for individual users
ALTER TABLE profiles ALTER COLUMN org_id DROP NOT NULL;

-- Create a function to safely create user profiles
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if it doesn't exist
  INSERT INTO profiles (id, org_id, full_name, role, email)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data->>'user_type' = 'individual' THEN NULL
      ELSE NULL  -- Default to individual, org creation happens separately
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    CASE
      WHEN NEW.raw_user_meta_data->>'user_type' = 'individual' THEN 'manager'
      ELSE 'owner'  -- Default role for org users
    END,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profiles on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Update RLS policies to handle individual users (org_id = null)
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization or their own profile" ON profiles
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()  -- Allow users to see their own profile
    OR org_id IS NULL   -- Allow viewing individual user profiles
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile (limited fields)" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent privilege escalation - users cannot change role or org_id
    org_id IS NOT DISTINCT FROM (SELECT org_id FROM profiles WHERE id = auth.uid()) AND
    role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Remove the insert policy - profiles are created automatically by trigger
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Update existing tables to allow null org_id
ALTER TABLE leads ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE accounts ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE contacts ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE cases ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE opportunities ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE campaigns ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE energy_logs ALTER COLUMN org_id DROP NOT NULL;

-- Update RLS policies for individual users (allow access when org_id is null)
-- For individual users, they should only see their own data
DROP POLICY IF EXISTS "Users can view leads in their org" ON leads;
CREATE POLICY "Users can view leads in their org or own leads" ON leads
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    OR (org_id IS NULL AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert leads for their org" ON leads;
CREATE POLICY "Users can insert leads for their org or own leads" ON leads
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    OR (org_id IS NULL AND created_by = auth.uid())
  );

-- Similar updates for other tables would be needed, but for now focus on profiles