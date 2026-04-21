# Email API Setup Guide

## Overview
The Industrial EMS now includes a complete email verification system with Supabase backend integration. This system provides:

- ✅ **Real email sending** via Supabase Email Service + Resend fallback
- ✅ **Database persistence** - users and verification codes survive deployments
- ✅ **Admin dashboard** - manage emails, users, and verification codes
- ✅ **2FA verification** - secure email-based two-factor authentication

## 🚀 Quick Setup

### 1. Environment Variables
Add these to your Supabase project settings:

```bash
# Required for email sending
RESEND_API_KEY=your_resend_api_key_here

# Supabase URLs (should already be set)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Deploy Database Schema
Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
```

### 3. Deploy Edge Functions
```bash
# Deploy the email sending function
supabase functions deploy send-email

# Deploy the user management function
supabase functions deploy user-management
```

### 4. Configure Email Templates
The system uses HTML email templates. You can customize them in:
- `supabase/functions/send-email/index.ts` - Email sending logic
- `src/app/components/crm/emailApi.ts` - Email content templates

## 📧 How It Works

### Email Sending Flow
1. **Primary**: Supabase Email Service (free tier included)
2. **Fallback**: Resend API (if Supabase fails)
3. **Logging**: All emails logged to `email_logs` table
4. **Tracking**: Verification codes tracked in `verification_codes` table

### User Persistence
- Users stored in Supabase `users` table (not localStorage)
- Survives deployments and browser refreshes
- Includes 2FA status, email verification, roles

### Admin Access
- Navigate to **Email Admin** in the sidebar
- Login with admin credentials
- View all email logs and verification attempts
- Manage user accounts and cleanup expired codes

## 🔐 Security Features

- **No code display**: Verification codes never shown in UI
- **Expiry**: Codes expire after 10 minutes
- **Attempts tracking**: Failed attempts are logged
- **Admin oversight**: All email activity is auditable

## 🧪 Testing

### Test Email Sending
1. Go to Email Admin → Send Test Email
2. Check your inbox for the test message
3. Verify logs appear in Email Logs tab

### Test 2FA
1. Go to Settings → Security tab
2. Enable Two-Factor Authentication
3. Request verification code
4. Check email for the code
5. Enter code to complete setup

## 📊 Database Tables

### `users`
- Stores all user accounts with persistent data
- Includes 2FA status, email verification, roles

### `email_logs`
- Tracks all sent emails
- Includes status, provider used, timestamps

### `verification_codes`
- Stores 2FA verification codes
- Auto-expires after 10 minutes
- Tracks verification attempts

## 🔧 API Endpoints

### Email Sending
```
POST /functions/v1/send-email
{
  "to": "user@example.com",
  "subject": "Verification Code",
  "html": "<html>...</html>",
  "verificationCode": "123456"
}
```

### User Management
```
POST /functions/v1/user-management
# Handles verification code creation/verification
# User CRUD operations
```

## 🚨 Troubleshooting

### Emails Not Sending
1. Check Supabase Email configuration in dashboard
2. Verify RESEND_API_KEY is set
3. Check function logs: `supabase functions logs send-email`

### Users Not Persisting
1. Verify database migration ran successfully
2. Check Supabase connection in browser dev tools
3. Ensure user has proper permissions

### Admin Login Issues
1. Verify admin user exists in `users` table
2. Check Supabase Auth configuration
3. Ensure proper RLS policies are set

## 📞 Support

For issues:
1. Check Supabase function logs
2. Verify environment variables
3. Test with the Email Admin dashboard
4. Check browser console for errors

The system is now production-ready with real email delivery and database persistence! 🎉