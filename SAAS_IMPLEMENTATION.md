# SaaS Implementation Roadmap

This guide outlines the implementation of a multi-tenant SaaS platform on top of your existing EMS CRM system, with support for Cloudflare Pages, custom domains, and payment integration.

## Phase 1: Multi-Tenancy & Data Isolation ✨

### 1.1 Database Schema Updates

#### New Tables to Create:
- `organizations` - Company/tenant information
- `profiles` - Links users to organizations with roles
- `invitations` - Pending team member invitations
- `subscriptions` - Subscription and billing info
- `audit_logs` - Activity tracking for compliance

#### Existing Tables to Modify:
- Add `org_id` column to: leads, accounts, contacts, tasks, energy_logs, cases, opportunities, campaigns

**Status**: Database migrations in `/supabase/migrations/002_saas_schema.sql`

### 1.2 Row-Level Security (RLS)

All queries will be automatically filtered by organization:
```
Only show data where org_id = current_user's org_id
```

**Policy Files**: `/supabase/migrations/003_rls_policies.sql`

## Phase 2: Authentication Enhancement

### 2.1 Built-in Auth Methods
- ✅ Email/Password (existing)
- 🔄 Magic Link (passwordless)
- 🔄 Google OAuth
- 🔄 GitHub OAuth

**Implementation**: `src/app/contexts/AuthContext.tsx`

### 2.2 Organization Onboarding
- Signup → Organization Creation → Team Invite
- Custom subdomain support (optional)
- Email verification

## Phase 3: Team Management

### 3.1 Invite System
- Admin sends invite link via email
- New user creates account via invite link
- Automatically assigned to correct organization

**Components**:
- `InviteMember.tsx` - Send invitations
- `AcceptInvitation.tsx` - Accept/signup flow
- `TeamSettings.tsx` - Manage team members

### 3.2 Role-Based Access Control (RBAC)
```
Roles: owner, admin, member, viewer
Each role has different permissions per feature
```

## Phase 3.5: Individual Account Mode

### 3.5.1 Individual User Setup
Individual users can access the system without creating an organization. They get a simplified dashboard with project supervisor/manager capabilities.

**Setup Steps:**
1. User visits landing page and selects "Individual Access"
2. Signs up with email/password or social auth (Google, GitHub)
3. Profile is automatically created with `role: 'manager'` and `org_id: null`
4. User is redirected to individual dashboard

**Database Changes:**
- Profiles table supports `org_id: null` for individual users
- RLS policies allow individual users to access their own data
- No organization isolation for individual mode

**Components:**
- `IndividualAuthPage.tsx` - Sign up/sign in for individuals
- `IndividualDashboard.tsx` - Simplified dashboard for individual users
- `AuthCallback.tsx` - Handles OAuth callbacks and profile creation

**Authentication:**
- Uses Supabase built-in email and social auth
- No organization context required
- Profile creation happens automatically after auth

### 3.5.2 Super Admin Setup
Super admins have system-wide access to manage all organizations and users.

**Creating a Super Admin:**
1. Sign up a regular user account with email (e.g., `superadmin@example.com`)
2. Run the SQL script in `supabase/create_superadmin.sql` to promote the user:
   ```sql
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
   ```
3. The user can now log in and access the Super Admin Dashboard at `/app/admin`

**Super Admin Features:**
- View all organizations and their subscription status
- Toggle Pro mode for any organization without payment
- Access system-wide analytics
- Manage user accounts across organizations

## Phase 4: Subscriptions & Payments

### 4.1 Pricing Plans
- **Free**: Limited features (14-day trial)
- **Pro**: $25/month (3 team members, advanced analytics)
- **Enterprise**: Custom pricing (unlimited)

### 4.2 Payment Providers (Choose One)
- **Paystack** (recommended for Nigeria/Africa)
- **Stripe** (global, for future expansion)

**Webhook Handlers**:
- `supabase/functions/paystack-webhook/`
- `supabase/functions/stripe-webhook/`

### 4.3 Billing Features
- Subscription status tracking
- Feature gating (Pro-only analytics, unlimited leads, etc.)
- Automated renewal/cancellation
- Invoice generation

## Phase 5: Admin Oversight

### 5.1 God Mode Dashboard
- Global statistics (total companies, revenue, active subs)
- Organization management
- User support tools
- System health monitoring

**Component**: `SuperAdminDashboard.tsx`

### 5.2 Audit Logs
- Track who changed what and when
- Compliance reporting
- Data backup recovery

## Phase 6: Deployment & Infrastructure

### 6.1 Current Setup (Vercel)
- Limited free tier features
- Not ideal for SaaS with multiple customers

### 6.2 Upgrade Path → Cloudflare Pages
- Better performance globally
- Web Application Firewall (WAF) included
- Custom domains support
- Easier subdomain management

### 6.3 Required Configurations
- Environment variables for Paystack/Stripe
- Custom domain verification
- Email sender verification (Resend/SendGrid)
- Database backups (Supabase Pro)

## Implementation Order

1. **Database Schema** (2-3 hours)
   - Create organizations, profiles, invitations tables
   - Add org_id to existing tables
   - Create RLS policies

2. **Authentication** (2-3 hours)
   - Update AppContext → AuthContext
   - Implement OAuth buttons
   - Add magic link support
   - Add individual auth flow

3. **Team Management** (2-3 hours)
   - Build InviteMember component
   - Create AcceptInvitation flow
   - Add TeamSettings page

4. **Individual Mode** (1-2 hours)
   - Create IndividualAuthPage and IndividualDashboard
   - Add auth callback handling
   - Update routing for individual paths

5. **Super Admin Setup** (1 hour)
   - Create SuperAdminDashboard
   - Add super admin SQL script
   - Update documentation

6. **Subscriptions** (3-4 hours)
   - Setup Stripe integration (replacing Paystack)
   - Create subscription dashboard
   - Implement feature gating

7. **Admin Dashboard** (2-3 hours)
   - Build SuperAdminDashboard (continued)
   - Add audit log viewer
   - Create support tools

8. **Testing & Deployment** (2-3 hours)
   - Test multi-tenant isolation
   - Verify RLS policies
   - Test individual and organization flows
   - Prepare for Cloudflare migration

## Files to Create/Modify

### New Files:
```
supabase/migrations/
  ├── 002_saas_schema.sql
  ├── 003_rls_policies.sql
  └── 004_seed_data.sql

supabase/
  └── create_superadmin.sql

src/app/contexts/
  ├── AuthContext.tsx (replaces AppContext)
  └── TenantContext.tsx

src/app/components/auth/
  ├── OAuthButtons.tsx
  ├── MagicLinkForm.tsx
  ├── SignupFlow.tsx
  ├── IndividualAuthPage.tsx
  ├── IndividualDashboard.tsx
  └── AuthCallback.tsx

src/app/components/team/
  ├── InviteMember.tsx
  ├── TeamSettings.tsx
  └── AcceptInvitation.tsx

src/app/components/billing/
  ├── SubscriptionPlans.tsx
  ├── BillingSettings.tsx
  └── PaymentPortal.tsx

src/app/components/admin/
  ├── SuperAdminDashboard.tsx
  ├── AuditLogViewer.tsx
  └── SystemHealth.tsx

src/lib/
  ├── supabaseClient.ts (updated for RLS)
  ├── featureGating.ts
  ├── subscriptionChecks.ts
  └── paymentGateway.ts

supabase/functions/
  ├── paystack-webhook/index.ts
  ├── stripe-webhook/index.ts
  ├── stripe-checkout/index.ts
  ├── stripe-admin-toggle/index.ts
  ├── invite-email/index.ts
  └── org-setup/index.ts
```

### Modified Files:
```
src/app/App.tsx (update imports, routing for individual and callback paths)
src/app/components/Layout.tsx (add team/billing nav)
src/app/components/Sidebar.tsx (add admin section)
src/app/components/LoginPage.tsx (add OAuth/magic link)
src/app/components/IndividualAuthPage.tsx (improve profile creation and error handling)
```
package.json (add @supabase/auth-ui-react, stripe, paystack)
.env (add PAYSTACK_KEY, STRIPE_KEY, etc.)
```

## Environment Variables Required

```bash
# Supabase (already set)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Supabase Service Role (for Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=...

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Payment Providers
PAYSTACK_PUBLIC_KEY=...
PAYSTACK_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...

# Email Service
RESEND_API_KEY=... (already set)

# Custom Domain (after migration)
CUSTOM_DOMAIN=app.ems-tracker.com
```

## Testing Checklist

- [ ] Organizations can be created with unique data
- [ ] RLS prevents cross-organization data leaks
- [ ] OAuth login works for all providers
- [ ] Magic link email sends successfully
- [ ] Team invites work correctly
- [ ] Subscriptions activate properly
- [ ] Feature gates work as expected
- [ ] Payment webhooks process correctly
- [ ] Admin dashboard shows correct metrics
- [ ] Audit logs track all changes

## Post-Migration (Cloudflare Pages)

1. Update DNS to point to Cloudflare
2. Enable WAF rules
3. Setup email domain verification
4. Verify custom domain in payment providers
5. Update API endpoints in Supabase
6. Test end-to-end on production domain

---

**Next Steps**: Start with Phase 1 database schema implementation. See individual component files for detailed setup instructions.
