-- Update profiles table to support individual users
-- Run this after 002_saas_schema.sql
-- NOTE: This migration requires the profiles table to already exist.
-- If you see "relation \"profiles\" does not exist", run 002_saas_schema.sql first.

-- Allow org_id to be null for individual users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ALTER COLUMN org_id DROP NOT NULL;

DO $$
DECLARE
  current_constraint text;
BEGIN
  SELECT conname
  INTO current_constraint
  FROM pg_constraint
  WHERE conrelid = 'profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role IN (%';

  IF current_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', current_constraint);
  END IF;

  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('owner', 'admin', 'member', 'viewer', 'manager')
  );
END$$;

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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Update RLS policies to handle individual users (org_id = null)
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization or their own profile" ON profiles;
CREATE POLICY "Users can view profiles in their organization or their own profile" ON profiles
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()  -- Allow users to see their own profile
    OR org_id IS NULL   -- Allow viewing individual user profiles
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile (limited fields)" ON profiles;
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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    ALTER TABLE leads ALTER COLUMN org_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
    ALTER TABLE accounts ALTER COLUMN org_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    ALTER TABLE contacts ALTER COLUMN org_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE tasks ALTER COLUMN org_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
    ALTER TABLE cases ALTER COLUMN org_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    ALTER TABLE opportunities ALTER COLUMN org_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
    ALTER TABLE campaigns ALTER COLUMN org_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'energy_logs') THEN
    ALTER TABLE energy_logs ALTER COLUMN org_id DROP NOT NULL;
  END IF;
END$$;

-- Update RLS policies for individual users (allow access when org_id is null)
-- For individual users, they should only see their own data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
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
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
    DROP POLICY IF EXISTS "Users can view accounts in their org" ON accounts;
    CREATE POLICY "Users can view accounts in their org or own accounts" ON accounts
      FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can insert accounts for their org" ON accounts;
    CREATE POLICY "Users can insert accounts for their org or own accounts" ON accounts
      FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    DROP POLICY IF EXISTS "Users can view contacts in their org" ON contacts;
    CREATE POLICY "Users can view contacts in their org or own contacts" ON contacts
      FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can insert contacts for their org" ON contacts;
    CREATE POLICY "Users can insert contacts for their org or own contacts" ON contacts
      FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    DROP POLICY IF EXISTS "Users can view tasks in their org" ON tasks;
    CREATE POLICY "Users can view tasks in their org or own tasks" ON tasks
      FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can insert tasks for their org" ON tasks;
    CREATE POLICY "Users can insert tasks for their org or own tasks" ON tasks
      FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
    DROP POLICY IF EXISTS "Users can view cases in their org" ON cases;
    CREATE POLICY "Users can view cases in their org or own cases" ON cases
      FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can insert cases for their org" ON cases;
    CREATE POLICY "Users can insert cases for their org or own cases" ON cases
      FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    DROP POLICY IF EXISTS "Users can view opportunities in their org" ON opportunities;
    CREATE POLICY "Users can view opportunities in their org or own opportunities" ON opportunities
      FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can insert opportunities for their org" ON opportunities;
    CREATE POLICY "Users can insert opportunities for their org or own opportunities" ON opportunities
      FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
    DROP POLICY IF EXISTS "Users can view campaigns in their org" ON campaigns;
    CREATE POLICY "Users can view campaigns in their org or own campaigns" ON campaigns
      FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can insert campaigns for their org" ON campaigns;
    CREATE POLICY "Users can insert campaigns for their org or own campaigns" ON campaigns
      FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'energy_logs') THEN
    DROP POLICY IF EXISTS "Users can view energy logs in their org" ON energy_logs;
    CREATE POLICY "Users can view energy logs in their org or own energy logs" ON energy_logs
      FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );

    DROP POLICY IF EXISTS "Users can insert energy logs for their org" ON energy_logs;
    CREATE POLICY "Users can insert energy logs for their org or own energy logs" ON energy_logs
      FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR (org_id IS NULL AND created_by = auth.uid())
      );
  END IF;
END$$;

-- Similar updates for other tables would be needed, but for now focus on profiles