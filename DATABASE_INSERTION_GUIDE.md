# 🚀 Direct Database Insertion Guide

This guide walks you through creating test data directly in your Supabase database, bypassing the email rate limit.

## Option 1: Using Node.js Script (Easiest)

### Prerequisites
- Your Supabase **Service Role Key** (NOT the Anon key)
- Node.js installed

### Step 1: Get Your Service Role Key

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Click **Settings** (bottom left) → **API**
4. Copy the **Service Role Key** (labeled as "service_role" or "SECRET")
   - ⚠️ **IMPORTANT**: This is a secret key - never commit it to git!
   - It has full database access

### Step 2: Run the Script

```bash
# Windows (Command Prompt)
set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
node create-test-data.js

# Linux/Mac (Terminal)
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
node create-test-data.js
```

Replace `your_service_role_key_here` with your actual service role key.

### Step 3: Expected Output

```
🚀 Starting test data insertion...

Test Details:
  Email: testuser@company.com
  Password: TestPassword123!
  Organization: Test Development Company
  ...

📝 Step 1: Creating auth user...
✅ User created: 550e8400-e29b-41d4-a716-446655440000

🏢 Step 2: Creating organization...
✅ Organization created: f47ac10b-58cc-4372-a567-0e02b2c3d479

👤 Step 3: Creating profile...
✅ Profile created for user: 550e8400-e29b-41d4-a716-446655440000

🔍 Step 4: Verifying data...
✅ Organization verified
✅ Profile verified
✅ Profile org_id matches: true

============================================================
✅ SUCCESS! Test data created successfully
============================================================

📋 TEST CREDENTIALS:
   Email:       testuser@company.com
   Password:    TestPassword123!
   Organization: Test Development Company
   Org Slug:    test-dev-company-1777739XXX

🔗 Login URL: http://localhost:5174/auth/organization-login
```

---

## Option 2: Using Supabase SQL Editor (Manual)

### Step 1: Open SQL Editor

1. Go to Supabase dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**

### Step 2: Run the SQL Script

Copy and paste the contents of `insert-test-data.sql` into the SQL editor.

Update these values in the SQL:
- `'Test Development Company'` - Organization name
- `'test-dev-company-2026'` - Organization slug (must be unique)
- `'550e8400-e29b-41d4-a716-446655440000'` - User ID (any UUID)
- `'john@testcompany.com'` - Email
- `'John Developer'` - Full name

Then click **Run** (Ctrl+Enter).

### Step 3: Create Auth User (Manual Step)

1. Go to **Authentication** → **Users** in Supabase
2. Click **Add User** → **Create new user**
3. Enter:
   - Email: `john@testcompany.com` (or your test email)
   - Password: `TestPassword123!`
   - Auto-confirm email: Toggle **ON**
4. Click **Create user**

**IMPORTANT**: The User ID you get here must match the `id` in the SQL INSERT (the UUID value).

---

## Option 3: Use Existing Supabase User

If you already have a test user in Supabase:

1. Get their User ID from **Authentication** → **Users**
2. Update the UUID in the script/SQL
3. Run it

---

## Testing After Data Creation

### Test Credentials
```
Email:    testuser@company.com
Password: TestPassword123!
```

### Step 1: Login to App
1. Go to http://localhost:5174/auth/organization-login
2. Enter email and password
3. Click **Sign In**

### Step 2: Verify Dashboard
Should see:
- ✅ Dashboard loads successfully
- ✅ Greeting shows: "Hello, [Your Name]"
- ✅ Sidebar shows user name and email
- ✅ Role badge shows "owner"
- ✅ All navigation works

### Step 3: Verify Organization
In Supabase dashboard:
- ✅ **organizations** table has new row
- ✅ **profiles** table has new row
- ✅ Profile.org_id matches organizations.id

---

## Troubleshooting

### "Service Role Key is required"
- You didn't set the environment variable
- Double-check the key is set: `echo %SUPABASE_SERVICE_ROLE_KEY%` (Windows) or `echo $SUPABASE_SERVICE_ROLE_KEY` (Linux/Mac)

### "Failed to create user"
- The email might already exist
- Try a different email or check Supabase Users list
- Make sure you're using the correct service role key

### "Failed to create organization"
- The slug might already exist
- Update `TEST_ORG_SLUG` in the script to be unique

### "Profile creation failed"
- The user ID might not match what's in auth.users
- Double-check the UUID matches

### "RLS policy error"
- This means the RLS policies are still blocking
- Your service role key might not have full permissions
- Try running the SQL directly in Supabase SQL Editor

---

## Next Steps

1. ✅ **Create test data** using one of the options above
2. ✅ **Login** with test credentials
3. ✅ **Verify dashboard** displays correctly
4. ✅ **Test logout** and redirect
5. ✅ **Create another org** to test multi-tenancy

---

## Security Notes

⚠️ **NEVER commit your service role key to git!**

Add to `.gitignore`:
```
.env
.env.local
*.key
service-role-key
```

For production:
- Use environment variables, not hardcoded keys
- Rotate service role keys regularly
- Restrict access to production databases
- Use row-level security for all operations

---

## Questions?

If you encounter any issues:
1. Check the error message in the console
2. Verify you're using the **Service Role Key** (not Anon Key)
3. Make sure the UUIDs are unique
4. Check that auth.users table has the user before linking to profile
