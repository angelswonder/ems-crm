-- Update profiles table to support individual users
-- Run this after 002_saas_schema.sql

-- Allow org_id to be null for individual users
ALTER TABLE profiles ALTER COLUMN org_id DROP NOT NULL;

-- Update RLS policies to handle individual users (org_id = null)
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization or their own profile" ON profiles
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()  -- Allow users to see their own profile
    OR org_id IS NULL   -- Allow viewing individual user profiles
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

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