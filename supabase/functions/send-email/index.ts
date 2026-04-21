import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface EmailRequest {
  to: string
  subject: string
  html: string
  verificationCode?: string
}

interface EmailLog {
  id: string
  to: string
  subject: string
  html: string
  verification_code?: string
  status: 'sent' | 'failed' | 'delivered'
  provider: 'supabase' | 'resend'
  sent_at: string
  error_message?: string
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { to, subject, html, verificationCode }: EmailRequest = await req.json()

    // Log the email attempt
    const emailLog: EmailLog = {
      id: crypto.randomUUID(),
      to,
      subject,
      html,
      verification_code: verificationCode,
      status: 'sent',
      provider: 'supabase',
      sent_at: new Date().toISOString()
    }

    // Try Supabase Email first
    try {
      const { error } = await supabaseClient.auth.admin.sendRawEmail({
        to: [to],
        subject,
        html
      })

      if (error) throw error

      // Log successful send
      await supabaseClient.from('email_logs').insert(emailLog)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email sent successfully via Supabase',
          logId: emailLog.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } catch (supabaseError) {
      console.log('Supabase email failed, trying Resend fallback:', supabaseError)

      // Fallback to Resend
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        if (!resendApiKey) {
          throw new Error('No Resend API key configured')
        }

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Industrial EMS <noreply@industrial-ems.com>',
            to: [to],
            subject,
            html,
          }),
        })

        if (!resendResponse.ok) {
          throw new Error(`Resend API error: ${resendResponse.status}`)
        }

        // Update log for Resend success
        emailLog.provider = 'resend'
        await supabaseClient.from('email_logs').insert(emailLog)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Email sent successfully via Resend fallback',
            logId: emailLog.id
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      } catch (resendError) {
        console.log('Both email providers failed:', resendError)

        // Log the failure
        emailLog.status = 'failed'
        emailLog.error_message = `${supabaseError} | ${resendError}`
        await supabaseClient.from('email_logs').insert(emailLog)

        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to send email via both providers',
            error: `${supabaseError} | ${resendError}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }
    }
  } catch (error) {
    console.error('Email function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})