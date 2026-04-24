# Complete SaaS Implementation Guide

This guide walks through implementing the complete multi-tenant SaaS platform with authentication, subscriptions, and team management.

## Quick Start Checklist

- [ ] **Phase 1**: Database schema and RLS policies
- [ ] **Phase 2**: Authentication system (OAuth + Magic Link)
- [ ] **Phase 3**: Team management (invites + roles)
- [ ] **Phase 4**: Subscriptions & payments (Paystack)
- [ ] **Phase 5**: Admin dashboards
- [ ] **Phase 6**: Testing & deployment

---

## Phase 1: Database Schema Setup ✨

### 1.1 Run Database Migrations

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project → SQL Editor
3. Create a new query and paste the contents of:
   ```
   supabase/migrations/002_saas_schema.sql
   ```
4. Run the migration
5. Verify that all tables are created:
   - `organizations`
   - `profiles`
   - `invitations`
   - `subscriptions`
   - `audit_logs`

> Note: `002_saas_schema.sql` also contains optional updates for existing CRM tables such as `leads`, `accounts`, `contacts`, `tasks`, `cases`, `opportunities`, `campaigns`, and `energy_logs`.
> If those tables are not present in your project, the migration will safely skip those sections.

> After this, run `supabase/migrations/003_individual_users.sql` to enable individual user support. That migration is also safe to run when optional CRM tables are missing.

### 1.2 Migrate Existing Data

**Only run this if you have existing CRM data from a previous version.**

For existing CRM records, you need to link them to an organization:

```sql
-- Create your first organization
INSERT INTO organizations (name, slug, billing_email) 
VALUES ('Your Company', 'your-company', 'admin@yourcompany.com')
RETURNING id;

-- Copy the returned ID and run this for each table:
UPDATE leads SET org_id = 'YOUR_ORG_ID' WHERE org_id IS NULL;
UPDATE accounts SET org_id = 'YOUR_ORG_ID' WHERE org_id IS NULL;
UPDATE contacts SET org_id = 'YOUR_ORG_ID' WHERE org_id IS NULL;
-- ... repeat for other tables

-- Create admin profile
INSERT INTO profiles (id, org_id, full_name, role)
VALUES ('YOUR_USER_ID', 'YOUR_ORG_ID', 'Admin User', 'owner');
```

> **Important**: If you get "relation does not exist" errors, it means you don't have existing CRM tables yet. For a fresh SaaS setup, skip the UPDATE statements and only run the organization creation and admin profile insertion.

### 1.2.1 Fresh SaaS Setup (No Existing Data)

If you're starting fresh without existing CRM data:

```sql
-- Just create the organization
INSERT INTO organizations (name, slug, billing_email) 
VALUES ('Your Company', 'your-company', 'admin@yourcompany.com')
RETURNING id;

-- Create admin profile (replace YOUR_USER_ID with actual user ID)
INSERT INTO profiles (id, org_id, full_name, role)
VALUES ('YOUR_USER_ID', 'YOUR_ORG_ID', 'Admin User', 'owner');
```

### 1.3 Create Admin User Account

**Before creating the admin profile, the admin user must sign up first:**

1. Go to your app's signup page
2. Have the admin create an account with email/password
3. Copy their user ID from the `auth.users` table in Supabase
4. Use that ID in the `profiles` insert above

The admin will login using the email/password they signed up with - passwords are stored in Supabase Auth, not in the profiles table.

### 1.4 Test RLS Policies

Login with a different user and verify they can't see other organizations' data.

---

## Phase 2: Authentication Enhancement ✨

### 2.1 Update Environment Variables

Add these to your `.env` file:

```env
# Supabase (already set)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# For Edge Functions
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_your_paystack_key
PAYSTACK_SECRET_KEY=sk_live_your_paystack_secret

# Email Service
RESEND_API_KEY=your-resend-key (already set)
```

### 2.2 Setup OAuth Providers

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:5173/auth/callback` (for local dev)
6. Copy Client ID and Secret to `.env`

#### GitHub OAuth

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Create a new OAuth app
3. Set Authorization callback URL:
   - `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to `.env`

#### Configure in Supabase

1. Go to Supabase → Authentication → Providers
2. Enable **Google** and **GitHub**
3. Add your credentials from above

### 2.3 Update LoginPage Component

Replace your current `LoginPage.tsx` to support the new auth methods:

```tsx
import { OAuthButtons } from './auth/OAuthButtons';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { signInWithPassword, signInWithMagicLink } = useAuth();
  // Implement login form with:
  // - Email/password login
  // - Magic link option
  // - OAuth buttons (Google, GitHub)
  return (
    // ... login UI with all methods
  );
}
```

---

## Phase 3: Team Management ✨

### 3.1 Add Invite Section to Settings

Add the InviteMember component to your Settings page:

```tsx
import { InviteMember } from './team/InviteMember';

export function SettingsPage() {
  return (
    <div>
      {/* ... other settings ... */}
      <InviteMember />
    </div>
  );
}
```

### 3.2 Create AcceptInvitation Page

Create a new page for handling invitation links:

```tsx
// src/app/components/auth/AcceptInvitation.tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

export function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      // Verify token and fetch invitation details
      // Then show signup form or auto-login flow
    }
  }, [token]);

  return (
    <div>
      {/* Show signup/join flow */}
    </div>
  );
}
```

---

## Phase 4: Subscriptions & Payments ✨

### 4.1 Setup Paystack Account

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Create an account if you don't have one
3. Go to Settings → API Keys
4. Copy Public Key and Secret Key to `.env`

### 4.2 Deploy Payment Edge Functions

In your terminal:

```bash
# Deploy Paystack webhook handler
supabase functions deploy paystack-webhook

# Deploy checkout initialization
supabase functions deploy paystack-checkout

# Set secrets (in Supabase console)
supabase secrets set PAYSTACK_SECRET_KEY="sk_live_..."
```

### 4.3 Configure Webhook in Paystack

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL:
   ```
   https://your-project.supabase.co/functions/v1/paystack-webhook
   ```
3. Events to listen for:
   - `charge.success`
   - `charge.failed`
   - `subscription.disable`

### 4.4 Add Billing Page

Create a billing dashboard:

```tsx
import { SubscriptionPlans } from './billing/SubscriptionPlans';

export function BillingPage() {
  return (
    <div>
      <h1>Subscription & Billing</h1>
      <SubscriptionPlans showPricing={true} />
    </div>
  );
}
```

---

## Phase 5: Admin Dashboard ✨

### 5.1 Add God Mode Dashboard

Create a route for super-admin access:

```tsx
import { SuperAdminDashboard } from './admin/SuperAdminDashboard';

// In your routing:
case "admin":
  return <SuperAdminDashboard />;
```

### 5.2 Mark Super Admin Users

To enable access to the super admin dashboard, manually update the profile:

```sql
UPDATE profiles 
SET role = 'owner', org_id = 'super-admin'
WHERE id = 'YOUR_ADMIN_USER_ID';

-- Create super-admin org
INSERT INTO organizations (id, name, slug)
VALUES ('super-admin', 'System Admin', 'super-admin');
```

---

## Phase 6: Implementation Integration ✨

### 6.1 Update App.tsx

Replace your existing AppContext import with AuthContext:

```tsx
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      {/* Rest of app */}
    </AuthProvider>
  );
}
```

### 6.2 Update Navigation

Add team, billing, and admin sections to sidebar:

```tsx
const navigationItems = [
  // ... existing items ...
  { id: 'team', label: 'Team & Invites', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'admin', label: 'System Admin', icon: Settings, adminOnly: true },
];
```

### 6.3 Add Feature Gating

Use feature gating throughout your app:

```tsx
import { hasFeature } from '../lib/featureGating';
import { useAuth } from '../contexts/AuthContext';

export function AnalyticsPage() {
  const { tenant } = useAuth();
  
  if (!hasFeature('advancedAnalytics', tenant)) {
    return <UpgradePrompt feature="Advanced Analytics" />;
  }

  return <FullAnalytics />;
}
```

---

## Environment Variables Complete Reference

```bash
# === SUPABASE ===
VITE_SUPABASE_URL=https://project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# === OAUTH ===
GOOGLE_CLIENT_ID=123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GITHUB_CLIENT_ID=abc123def456
GITHUB_CLIENT_SECRET=ghp_...

# === PAYMENTS ===
PAYSTACK_PUBLIC_KEY=pk_live_abc123...
PAYSTACK_SECRET_KEY=sk_live_def456...
STRIPE_PUBLISHABLE_KEY=pk_live_... (optional)
STRIPE_SECRET_KEY=sk_live_... (optional)

# === EMAIL ===
RESEND_API_KEY=re_...

# === CUSTOM DOMAIN (after migration) ===
CUSTOM_DOMAIN=app.ems-tracker.com
```

---

## Deployment Checklist

### Before Going Live

- [ ] All database migrations applied
- [ ] OAuth providers configured
- [ ] Paystack webhook configured
- [ ] Email templates tested
- [ ] RLS policies verified (cross-org data leakage tested)
- [ ] Edge Functions deployed
- [ ] Subscription flow tested end-to-end
- [ ] Team invitations tested
- [ ] Admin dashboard verified

### Migration to Cloudflare Pages

When ready to migrate from Vercel:

1. Build and deploy to Cloudflare Pages
2. Configure custom domain DNS
3. Update Supabase API endpoint if needed
4. Update OAuth redirect URIs in Google/GitHub
5. Update Paystack webhook URL
6. Enable Cloudflare WAF rules

---

## Testing Guide

### Test Multi-Tenancy

```
1. Create Org A and Org B
2. Add User 1 to Org A, User 2 to Org B
3. Login as User 1 - should only see Org A data
4. Login as User 2 - should only see Org B data
5. Try to query User 2's data as User 1 - should get 401
```

### Test Subscriptions

```
1. Create new org on Free plan
2. Attempt to use Pro feature - should be blocked
3. Click Upgrade → Paystack
4. Complete payment with test card
5. Verify subscription_status = 'active' in database
6. Verify Pro features now accessible
```

### Test Team Invites

```
1. Invite team member to organization
2. Copy invitation link
3. Logout and visit link in incognito
4. Create new account with invited email
5. Verify auto-joined organization
6. Verify correct role assigned
```

---

## Troubleshooting

### RLS Policy Blocking Queries

**Problem**: Queries return empty when not empty
**Solution**: Check RLS policies in Supabase SQL Editor, verify org_id matches profile's org_id

### OAuth Not Working

**Problem**: Redirect URI mismatch error
**Solution**: Ensure redirect URIs in OAuth provider match Supabase callback URL exactly

### Paystack Webhook Not Firing

**Problem**: Subscription not updating after payment
**Solution**: 
- Verify webhook URL in Paystack dashboard
- Check Edge Function logs
- Ensure SECRET_KEY is correct in Supabase secrets

### Features Not Gating Properly

**Problem**: User can access Pro feature on Free plan
**Solution**: Check `getFeatureFlags()` function, verify tenant.plan_type is correctly set

---

## Next Steps

1. **Monitoring**: Set up Sentry or similar for error tracking
2. **Analytics**: Add PostHog or Mixpanel to track user behavior
3. **Support**: Integrate Intercom or similar for customer support
4. **Backups**: Upgrade Supabase to Pro plan for daily backups
5. **Custom Domain**: Setup Resend domain verification for better email delivery
6. **Documentation**: Create user-facing docs for team members

---

For questions or issues, refer to:
- [Supabase Docs](https://supabase.com/docs)
- [Paystack Docs](https://paystack.com/docs/api/)
- [Deno Functions Docs](https://deno.com/deploy/docs)
