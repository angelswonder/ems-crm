# EMS CRM - Debug & Admin Guide

## 🚨 Critical Issues Fixed

### 1. **Organization Login Page Missing**
**Problem**: No way for existing organization users to log in - only signup page existed.

**Solution**: Added login links to landing page:
- Individual users: "Sign in here" link under individual card
- Organization users: "Sign in here" link under organization card

### 2. **No Super Admin Promotion Function**
**Problem**: No way to promote users to super admin for system administration.

**Solution**: Created `promote-superadmin` Edge Function:
```bash
# Deploy the function
supabase functions deploy promote-superadmin

# Promote a user (replace USER_ID)
curl -X POST 'https://your-project.supabase.co/functions/v1/promote-superadmin' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "USER_ID"}'
```

### 3. **Cannot Create Super Admin**
**Problem**: `create_superadmin.sql` couldn't run because no users existed in `auth.users`.

**Solution**:
1. **First create a user** through the signup flow
2. **Then promote them** using the Edge Function or SQL
3. Updated `create_superadmin.sql` with better instructions

### 4. **Users Not Being Created**
**Problem**: Signup appears to work but no users show up in database.

**Solution**: Added debug page at `/debug` to inspect:
- Auth users (requires service role)
- User profiles
- Organizations

## 🔧 How to Debug User Creation

### Step 1: Try Signup
1. Go to landing page (`/`)
2. Click "Get Started" on Organization card
3. Fill out the form and submit
4. **Check browser console** for detailed logs

### Step 2: Check Debug Page
1. Go to `/debug`
2. See if users appear in any of the sections:
   - **Auth Users**: Shows users from `auth.users` (needs service role)
   - **Profiles**: Shows user profiles from `profiles` table
   - **Organizations**: Shows created organizations

### Step 3: Common Issues
- **No auth users**: Supabase signup is failing
- **Auth users but no profiles**: Database trigger not working
- **Profiles but no organizations**: Organization creation failing

## 🛠️ Super Admin Setup

### Method 1: Edge Function (Recommended)
```bash
# 1. Deploy the function
supabase functions deploy promote-superadmin

# 2. Find a user ID from /debug page or Supabase dashboard

# 3. Promote user
curl -X POST 'https://your-project.supabase.co/functions/v1/promote-superadmin' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "USER_ID_HERE"}'
```

### Method 2: Direct SQL
```sql
-- Run in Supabase SQL Editor with service role
UPDATE profiles
SET org_id = 'super-admin', role = 'owner', updated_at = NOW()
WHERE id = 'USER_ID_HERE';
```

## 📋 Testing Flow

### Organization Signup & Login
1. **Signup**: `/` → Organization "Get Started" → Fill form → Submit
2. **Verify email** if required
3. **Login**: `/` → Organization "Sign in here" → Enter credentials → Should go to `/app`

### Individual Signup & Login
1. **Signup**: `/` → Individual "Get Started" → Fill form → Submit
2. **Verify email** if required
3. **Login**: `/` → Individual "Sign in here" → Enter credentials → Should go to `/individual/dashboard`

### Sign-out/Sign-in Loop Fix
1. Login as User A
2. Logout completely
3. Login as User B
4. **Should not flicker** - should load User B's dashboard immediately

## 🔍 Debug Commands

```bash
# Check if migrations ran
supabase db diff --schema public

# Reset database (CAUTION: destroys data)
supabase db reset

# Check function logs
supabase functions logs promote-superadmin

# Deploy all functions
supabase functions deploy
```

## 🚨 Emergency Access

If you need to manually create a super admin user:

1. **Create user directly in Supabase**:
   - Go to Authentication → Users
   - Add user manually with email/password
   - Note the user ID

2. **Create profile manually**:
   ```sql
   INSERT INTO profiles (id, org_id, full_name, role, email)
   VALUES ('USER_ID', 'super-admin', 'Super Admin', 'owner', 'admin@example.com');
   ```

3. **Test login** with the manually created credentials

## 📝 Migration Order

Run these in Supabase SQL Editor:
1. `001_initial_schema.sql`
2. `002_saas_schema.sql`
3. `003_individual_users.sql`
4. `004_fix_auth_and_rls.sql` (new)

## 🎯 Next Steps

1. **Test signup flow** and check `/debug` page
2. **Deploy Edge Functions** if needed
3. **Create super admin** user
4. **Test organization creation** end-to-end
5. **Verify routing** works correctly for both user types