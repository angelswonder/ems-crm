// supabase/functions/send-invite-email/index.ts
// Sends invitation emails to new team members

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  try {
    const { invitationId, email, orgName, invitedByName, token } = await req.json();

    if (!invitationId || !email || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500 }
      );
    }

    // Generate invitation link
    const inviteLink = `${Deno.env.get('APP_URL') || 'https://app.ems-tracker.com'}/accept-invite?token=${token}`;

    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 40px 20px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're Invited! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${email},</p>
              
              <p><strong>${invitedByName}</strong> has invited you to join <strong>${orgName}</strong> on EMS Tracker.</p>
              
              <p>Click the button below to accept the invitation and get started:</p>
              
              <center>
                <a href="${inviteLink}" class="button">Accept Invitation</a>
              </center>
              
              <p>Or copy this link: <a href="${inviteLink}">${inviteLink}</a></p>
              
              <p>This invitation will expire in 7 days.</p>
              
              <p>If you have any questions, contact your team administrator.</p>
              
              <p>Happy tracking!<br>The EMS Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2024 EMS Tracker. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'invites@ems-tracker.com',
        to: email,
        subject: `${invitedByName} invited you to join ${orgName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error('Resend error:', error);
      throw new Error('Failed to send email');
    }

    // Log email sent
    await supabase
      .from('email_logs')
      .insert({
        to: email,
        subject: `Invitation to join ${orgName}`,
        type: 'invitation',
        status: 'sent',
        provider: 'resend',
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent' 
      }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Send invite error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send invitation' }),
      { status: 500 }
    );
  }
});
