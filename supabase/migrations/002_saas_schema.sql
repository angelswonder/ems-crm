-- SaaS Multi-Tenancy Schema
-- Run this in Supabase SQL Editor after deploying 001_initial_schema.sql

-- ============================================================================
-- 1. ORGANIZATIONS TABLE (Core - Every company gets one)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE, -- For subdomains: slug.app.ems-tracker.com
  logo_url text,
  website text,
  
  -- Subscription & Billing
  plan_type text DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'), -- 14-day free trial
  
  -- Billing Contact
  billing_email text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text,
  
  -- Payment Provider Integration
  paystack_customer_code text, -- From Paystack
  stripe_customer_id text, -- From Stripe
  stripe_subscription_id text,
  
  -- Custom Domain Support (for future)
  custom_domain text UNIQUE,
  domain_verified boolean DEFAULT false,
  
  -- Settings
  max_team_members integer DEFAULT 3,
  max_leads integer DEFAULT 100,
  features jsonb DEFAULT '{"analytics": false, "advanced_reports": false, "api_access": false, "custom_branding": false}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_plan CHECK (plan_type IN ('free', 'pro', 'enterprise'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_subscription ON organizations(subscription_status);

-- ============================================================================
-- 2. PROFILES TABLE (Links Supabase Auth users to organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  full_name text,
  avatar_url text,
  email text,
  
  -- Role in organization
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'manager')),
  
  -- Settings
  theme_preference text DEFAULT 'dark',
  language text DEFAULT 'en',
  
  -- Notifications
  email_notifications boolean DEFAULT true,
  notification_preferences jsonb DEFAULT '{"marketing": false, "security": true, "updates": true}'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_org ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profile_role ON profiles(role);

-- ============================================================================
-- 3. INVITATIONS TABLE (Team invites)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invitations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'declined')),
  
  token uuid DEFAULT uuid_generate_v4(), -- For invitation link: /accept-invite?token=...
  expires_at timestamptz DEFAULT (now() + interval '7 days'), -- Expires after 7 days
  
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(org_id, email) -- Can't invite same email twice to same org
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitation_org ON invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitation_status ON invitations(status);

-- ============================================================================
-- 4. SUBSCRIPTIONS TABLE (Detailed billing history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  plan_type text NOT NULL CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled')),
  
  -- Pricing
  amount_per_month integer, -- In cents (e.g., 2500 = $25.00)
  currency text DEFAULT 'USD',
  billing_period_start timestamptz,
  billing_period_end timestamptz,
  
  -- Payment References
  payment_method text, -- 'paystack', 'stripe', 'manual'
  last_payment_date timestamptz,
  next_billing_date timestamptz,
  
  -- Subscription References
  paystack_authorization_code text,
  stripe_subscription_id text,
  
  auto_renew boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscription_org ON subscriptions(org_id);

-- ============================================================================
-- 5. AUDIT_LOGS TABLE (Compliance & security)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  action text NOT NULL, -- e.g., 'user_invited', 'lead_created', 'data_exported'
  resource_type text, -- e.g., 'lead', 'account', 'invitation'
  resource_id text,
  
  change_details jsonb, -- What changed (before/after values)
  ip_address inet,
  user_agent text,
  
  created_at timestamptz DEFAULT now()
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- 6. ADD ORG_ID TO EXISTING CRM TABLES
-- ============================================================================

-- Leads
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    ALTER TABLE IF EXISTS leads ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(org_id) WHERE org_id IS NOT NULL;
  END IF;
END$$;

-- Accounts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
    ALTER TABLE IF EXISTS accounts ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_accounts_org ON accounts(org_id) WHERE org_id IS NOT NULL;
  END IF;
END$$;

-- Contacts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    ALTER TABLE IF EXISTS contacts ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(org_id) WHERE org_id IS NOT NULL;
  END IF;
END$$;

-- Tasks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE IF EXISTS tasks ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(org_id) WHERE org_id IS NOT NULL;
  END IF;
END$$;

-- Cases
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
    ALTER TABLE IF EXISTS cases ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_cases_org ON cases(org_id) WHERE org_id IS NOT NULL;
  END IF;
END$$;

-- Opportunities
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    ALTER TABLE IF EXISTS opportunities ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(org_id) WHERE org_id IS NOT NULL;
  END IF;
END$$;

-- Campaigns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
    ALTER TABLE IF EXISTS campaigns ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(org_id) WHERE org_id IS NOT NULL;
  END IF;
END$$;

-- Energy Logs / Monitoring Data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'energy_logs') THEN
    ALTER TABLE IF EXISTS energy_logs ADD COLUMN org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_energy_logs_org ON energy_logs(org_id) WHERE org_id IS NOT NULL;
  END IF;
END$$;

-- ============================================================================
-- 7. UPDATE TIMESTAMP TRIGGERS
-- ============================================================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to organizations
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to invitations
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply to subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Organizations - Users can only see their own org
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id = (SELECT org_id FROM profiles WHERE id = auth.uid())
    OR -- Super admin can see all
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND org_id = organizations.id 
      AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Only organization owner can update" ON organizations;
CREATE POLICY "Only organization owner can update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = organizations.id 
      AND profiles.role = 'owner'
    )
  );

-- Profiles - Users can view team members in their org
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
CREATE POLICY "Users can view profiles in their organization" ON profiles
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Invitations - Users can see invitations for their org
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invitations for their organization" ON invitations;
CREATE POLICY "Users can view invitations for their organization" ON invitations
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Only admin+ can create invitations" ON invitations;
CREATE POLICY "Only admin+ can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND org_id = invitations.org_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view subscription for their org" ON subscriptions;
CREATE POLICY "Users can view subscription for their org" ON subscriptions
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit logs for their org" ON audit_logs;
CREATE POLICY "Users can view audit logs for their org" ON audit_logs
  FOR SELECT USING (
    org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true); -- Edge Functions use service role

-- ============================================================================
-- 9. APPLY RLS TO EXISTING TABLES
-- ============================================================================

-- Leads
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leads') THEN
    ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view leads in their org" ON leads;
    CREATE POLICY "Users can view leads in their org" ON leads
      FOR SELECT USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
    DROP POLICY IF EXISTS "Users can insert leads for their org" ON leads;
    CREATE POLICY "Users can insert leads for their org" ON leads
      FOR INSERT WITH CHECK (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
    DROP POLICY IF EXISTS "Users can update leads in their org" ON leads;
    CREATE POLICY "Users can update leads in their org" ON leads
      FOR UPDATE USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
    DROP POLICY IF EXISTS "Users can delete leads in their org" ON leads;
    CREATE POLICY "Users can delete leads in their org" ON leads
      FOR DELETE USING (
        org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
  END IF;
END$$;

-- Accounts (same pattern)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
    ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view accounts in their org" ON accounts;
    CREATE POLICY "Users can view accounts in their org" ON accounts
      FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can modify accounts in their org" ON accounts;
    CREATE POLICY "Users can modify accounts in their org" ON accounts
      FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can update accounts in their org" ON accounts;
    CREATE POLICY "Users can update accounts in their org" ON accounts
      FOR UPDATE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END$$;

-- Contacts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view contacts in their org" ON contacts;
    CREATE POLICY "Users can view contacts in their org" ON contacts
      FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can manage contacts in their org" ON contacts;
    CREATE POLICY "Users can manage contacts in their org" ON contacts
      FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can update contacts in their org" ON contacts;
    CREATE POLICY "Users can update contacts in their org" ON contacts
      FOR UPDATE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END$$;

-- Tasks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view tasks in their org" ON tasks;
    CREATE POLICY "Users can view tasks in their org" ON tasks
      FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can manage tasks in their org" ON tasks;
    CREATE POLICY "Users can manage tasks in their org" ON tasks
      FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can update tasks in their org" ON tasks;
    CREATE POLICY "Users can update tasks in their org" ON tasks
      FOR UPDATE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END$$;

-- Cases
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN
    ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view cases in their org" ON cases;
    CREATE POLICY "Users can view cases in their org" ON cases
      FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can manage cases in their org" ON cases;
    CREATE POLICY "Users can manage cases in their org" ON cases
      FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can update cases in their org" ON cases;
    CREATE POLICY "Users can update cases in their org" ON cases
      FOR UPDATE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END$$;

-- Opportunities
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view opportunities in their org" ON opportunities;
    CREATE POLICY "Users can view opportunities in their org" ON opportunities
      FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can manage opportunities in their org" ON opportunities;
    CREATE POLICY "Users can manage opportunities in their org" ON opportunities
      FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can update opportunities in their org" ON opportunities;
    CREATE POLICY "Users can update opportunities in their org" ON opportunities
      FOR UPDATE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END$$;

-- Campaigns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'campaigns') THEN
    ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view campaigns in their org" ON campaigns;
    CREATE POLICY "Users can view campaigns in their org" ON campaigns
      FOR SELECT USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can manage campaigns in their org" ON campaigns;
    CREATE POLICY "Users can manage campaigns in their org" ON campaigns
      FOR INSERT WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
    DROP POLICY IF EXISTS "Users can update campaigns in their org" ON campaigns;
    CREATE POLICY "Users can update campaigns in their org" ON campaigns
      FOR UPDATE USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
  END IF;
END$$;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. After running this migration, manually:
--    - Set org_id for all existing records in leads, accounts, etc.
--    - Create organization for your first tenant
--    - Create profile records linking users to org
--
-- 2. Update your .env with additional variables:
--    PAYSTACK_PUBLIC_KEY=...
--    PAYSTACK_SECRET_KEY=...
--    STRIPE_PUBLISHABLE_KEY=...
--    STRIPE_SECRET_KEY=...
--
-- 3. Deploy new Edge Functions:
--    - paystack-webhook
--    - stripe-webhook
--    - org-setup (creates org on first signup)
--    - send-invite-email
--
-- 4. Test RLS policies before going live
-- ============================================================================
