// Email API Database for 2FA Verification
// Now uses Supabase backend instead of localStorage

import { getSupabaseClient, isSupabaseConfigured } from '../../../lib/supabaseClient';

const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

export interface VerificationCode {
  id: string;
  email: string;
  code: string;
  created_at: string;
  expires_at: string;
  verified: boolean;
  verified_at?: string;
  attempts: number;
}

export interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  html_content?: string;
  verification_code?: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  provider: 'supabase' | 'resend';
  sent_at: string;
  error_message?: string;
}

export async function createVerificationCode(email: string): Promise<{ code: string; codeId: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('user-management', {
      body: { email, action: 'create' },
    });

    if (error) throw error;

    // For frontend compatibility, we need to return the code
    // In production, this would be sent via email only
    return { code: 'SENT_VIA_EMAIL', codeId: data.codeId };
  } catch (error) {
    console.error('Error creating verification code:', error);
    throw error;
  }
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  codeId: string,
  companyName: string = 'Industrial Management Tracking System'
): Promise<{ success: boolean; message: string; logId: string }> {
  try {
    const subject = `${companyName} - Two-Factor Authentication Code`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Two-Factor Authentication</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2c5f4e, #1e4d3d); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
    <p style="color: #e0e0e0; margin: 10px 0 0 0;">Secure Authentication System</p>
  </div>

  <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 30px;">
    <h2 style="color: #2c5f4e; margin-top: 0;">Two-Factor Authentication Code</h2>

    <p>Hello,</p>

    <p>Your verification code is:</p>

    <div style="background: #f8f9fa; border: 2px solid #2c5f4e; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #2c5f4e; font-family: monospace; letter-spacing: 4px;">${code}</span>
    </div>

    <p><strong>Important:</strong></p>
    <ul>
      <li>This code will expire in <strong>10 minutes</strong></li>
      <li>Enter this code in the application to complete verification</li>
      <li>Do not share this code with anyone</li>
    </ul>

    <p>If you did not request this code, please contact your system administrator immediately.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #666; font-size: 14px;">
      This is an automated message from ${companyName}.<br>
      Please do not reply to this email.
    </p>
  </div>
</body>
</html>`;

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to: email, subject, html, verificationCode: code },
    });

    if (error) throw error;

    return {
      success: true,
      message: data.message || 'Email sent successfully',
      logId: data.logId,
    };
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    return {
      success: false,
      message: `Failed to send email: ${error.message}`,
      logId: '',
    };
  }
}

export async function verifyCode(email: string, code: string): Promise<{ verified: boolean; message: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('user-management', {
      body: { email, action: 'verify', code },
    });

    if (error) {
      return { verified: false, message: error.message || 'Verification failed' };
    }

    return {
      verified: data.success || false,
      message: data.message || 'Verification completed',
    };
  } catch (error: any) {
    console.error('Error verifying code:', error);
    return { verified: false, message: 'Error verifying code. Please try again.' };
  }
}

export async function getVerificationStatus(email: string): Promise<VerificationCode | null> {
  try {
    // Get the most recent unverified code for this email
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch (error) {
    console.error('Error getting verification status:', error);
    return null;
  }
}

export async function getEmailLogs(email?: string): Promise<EmailLog[]> {
  try {
    let query = supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);

    if (email) {
      query = query.eq('to_email', email);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting email logs:', error);
    return [];
  }
}

export async function getVerificationCodeHistory(email?: string): Promise<VerificationCode[]> {
  try {
    let query = supabase
      .from('verification_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (email) {
      query = query.eq('email', email);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting verification history:', error);
    return [];
  }
}

export async function clearExpiredCodes(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_codes');
    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error clearing expired codes:', error);
    return 0;
  }
}

export async function resetEmailSystem(): Promise<void> {
  // This would require admin privileges in production
  console.warn('Email system reset not implemented for security reasons');
}
