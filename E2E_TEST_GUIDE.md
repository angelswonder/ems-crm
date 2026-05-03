# End-to-End User Creation & Login Test Guide

## Prerequisites
Before running this test, ensure your `.env` file has the correct Supabase configuration:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # This is critical for Edge Functions
```

## Completed Implementations

### 1. ✅ User Creation Persistence
- **File**: `supabase/functions/create-org-user/index.ts`
- **Purpose**: Creates users in Supabase auth + profiles database
- **Features**:
  - Auto-confirms email
  - Creates profile record linked to organization
  - Handles role mapping (manager/team-leader/supervisor → member)
  - Returns success with user ID and profile data

### 2. ✅ SuperAdmin Dashboard Metrics
- **File**: `src/app/components/admin/SuperAdminDashboard.tsx`
- **Fixed**:
  - Organization count display
  - Subscription status distribution (active/trialing/inactive)
  - Plan distribution (free/pro/enterprise)
  - Monthly revenue estimation

### 3. ✅ Invite Link Generation
- **File**: `supabase/functions/generate-invite-link/index.ts`
- **Purpose**: Creates invitation records with auto-generated tokens
- **Returns**: Full invite link with token

### 4. ✅ Invite Acceptance Workflow
- **File**: `supabase/functions/accept-invite/index.ts`
- **Features**:
  - Token validation
  - Email verification
  - Automatic profile creation on acceptance
  - Invitation status tracking

## Step-by-Step Testing

### Step 1: Create Organization
1. Navigate to `http://localhost:5177`
2. Click "Organization" → "Get Started"
3. Fill in organization details:
   - **Organization Name**: "Test Energy Corp"
   - **Organization URL**: "test-energy-corp"
   - **Admin Name**: "Test Admin"
   - **Admin Email**: Use a valid email from your Supabase allow-list
   - **Password**: Create a strong password
4. Click "Create Organization"
5. **Verify**: Admin user created in Supabase auth

### Step 2: Access Configuration Panel
1. Login with admin credentials (from Step 1)
2. Navigate to "Configuration" tab
3. Click "Add User" button
4. Fill in new user details:
   - **Full Name**: "Test Team Member"
   - **Email**: New email (must be in Supabase allow-list)
   - **Password**: Strong password
   - **Role**: "manager" / "team-leader" / "supervisor"
   - **Permissions**: Select appropriate permissions
5. Click "Create User"
6. **Verify**: Success toast notification

### Step 3: Verify User in Supabase
1. Open Supabase Dashboard
2. Go to **Authentication** → **Users**
3. **Verify**: New user appears in auth list
4. Go to **Database** → **profiles**
5. **Verify**: New user profile exists with correct org_id, role, and full_name

### Step 4: Test New User Login
1. Logout from admin account
2. Go to `http://localhost:5177/auth/organization-login`
3. Enter credentials from Step 2
4. Click "Sign In"
5. **Verify**: User logs in successfully and sees organization dashboard

### Step 5: Verify User Permissions
1. Once logged in as the new user:
2. Check that user can see their organization dashboard
3. Verify dashboard shows their assigned role and permissions
4. Check theme preference setting persists
5. Verify user appears in team members list (if accessible by role)

### Step 6: Test Invite Workflow (Optional)
1. Logout new user, login as admin
2. Go to "Team" section
3. Click "Invite Member"
4. Enter invitee email and role
5. Share the generated invite link
6. Open link in new browser/private window
7. If invited user has account, they accept with sign-in
8. If new user, they create account via signup
9. **Verify**: User appears in organization with correct role

## Troubleshooting

### Issue: "Email address is invalid"
- **Cause**: Supabase email restrictions
- **Solution**: Go to Supabase Dashboard → Auth → Providers → Email
  - Check "Email Verification" settings
  - Add allowed domains if using domain restrictions
  - Or disable restrictions for testing

### Issue: Edge Functions return errors
- **Cause**: Missing `SUPABASE_SERVICE_ROLE_KEY`
- **Solution**: 
  1. Get key from Supabase Dashboard → Settings → API
  2. Copy the "service_role" key (marked as Secret)
  3. Add to `.env`: `SUPABASE_SERVICE_ROLE_KEY=your-key`
  4. Restart dev server

### Issue: User creation succeeds but user can't login
- **Cause**: Profile not created or RLS policies blocking
- **Solution**:
  1. Check profiles table RLS policy
  2. Verify user appears in both auth and profiles
  3. Check browser console for auth errors

### Issue: Invite link shows localhost error
- **Cause**: Environment variable not set correctly
- **Solution**:
  1. Ensure `VITE_APP_URL` is set in `.env`
  2. Or verify `accept-invite` function returns proper JSON

## Expected Results

✅ **User Creation**
- User created in Supabase auth
- Profile record created in profiles table
- Role mapped correctly (manager/leader/supervisor → member)
- User can login with email/password

✅ **SuperAdmin Metrics**
- Organization count displays correctly
- Subscription status distribution shows accurate numbers
- Plan distribution (free/pro/enterprise) displays
- Revenue estimation calculates correctly

✅ **Invite Workflow**
- Invite link generated with token
- User can accept invite via link
- Profile created on acceptance
- Invitation marked as "accepted"

## Code References

- **User Creation**: [create-org-user function](../supabase/functions/create-org-user/index.ts)
- **SuperAdmin Dashboard**: [SuperAdminDashboard component](../src/app/components/admin/SuperAdminDashboard.tsx)
- **AppContext Integration**: [AppContext.tsx](../src/app/contexts/AppContext.tsx) - `addUser` callback
- **Configuration UI**: [Configuration component](../src/app/components/Configuration.tsx)

## Notes

- The system now persists all users to Supabase auth + profiles
- Role mapping ensures consistency across the platform
- All Edge Functions have proper error handling and logging
- RLS policies protect data while allowing admin operations via service role key
