import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface User {
  id?: string
  email: string
  company_email?: string
  first_name?: string
  last_name?: string
  role?: string
  phone_number?: string
  two_factor_enabled?: boolean
  email_verified?: boolean
}

interface VerificationCodeRequest {
  email: string
  action: 'create' | 'verify'
  code?: string
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

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (path) {
      case 'users': {
        if (req.method === 'GET') {
          // Get all users
          const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) throw error

          return new Response(
            JSON.stringify({ users }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }

        if (req.method === 'POST') {
          // Create or update user
          const userData: User = await req.json()

          const { data, error } = await supabaseClient
            .from('users')
            .upsert(userData, { onConflict: 'email' })
            .select()
            .single()

          if (error) throw error

          return new Response(
            JSON.stringify({ user: data, message: 'User saved successfully' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }
        break
      }

      case 'verification': {
        if (req.method === 'POST') {
          const { email, action, code }: VerificationCodeRequest = await req.json()

          if (action === 'create') {
            // Generate verification code
            const verificationCode = Math.random().toString().slice(2, 8).padEnd(6, '0')

            // Clean up expired codes first
            await supabaseClient.rpc('cleanup_expired_codes')

            // Get user
            const { data: user, error: userError } = await supabaseClient
              .from('users')
              .select('id')
              .eq('email', email)
              .single()

            if (userError) throw new Error('User not found')

            // Insert verification code
            const { data, error } = await supabaseClient
              .from('verification_codes')
              .insert({
                user_id: user.id,
                email,
                code: verificationCode,
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
              })
              .select()
              .single()

            if (error) throw error

            return new Response(
              JSON.stringify({
                success: true,
                codeId: data.id,
                message: 'Verification code created'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              },
            )
          }

          if (action === 'verify') {
            if (!code) throw new Error('Code is required')

            // Find and verify code
            const { data: verificationRecord, error: findError } = await supabaseClient
              .from('verification_codes')
              .select('*')
              .eq('email', email)
              .eq('code', code)
              .eq('verified', false)
              .gt('expires_at', new Date().toISOString())
              .single()

            if (findError || !verificationRecord) {
              // Increment attempts
              await supabaseClient
                .from('verification_codes')
                .update({ attempts: supabaseClient.sql`attempts + 1` })
                .eq('email', email)
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString())

              throw new Error('Invalid or expired code')
            }

            // Mark as verified
            const { error: updateError } = await supabaseClient
              .from('verification_codes')
              .update({
                verified: true,
                verified_at: new Date().toISOString()
              })
              .eq('id', verificationRecord.id)

            if (updateError) throw updateError

            // Update user 2FA status
            await supabaseClient
              .from('users')
              .update({ two_factor_enabled: true })
              .eq('id', verificationRecord.user_id)

            return new Response(
              JSON.stringify({
                success: true,
                message: 'Code verified successfully'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              },
            )
          }
        }
        break
      }

      case 'email-logs': {
        if (req.method === 'GET') {
          const { data: logs, error } = await supabaseClient
            .from('email_logs')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(100)

          if (error) throw error

          return new Response(
            JSON.stringify({ logs }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Endpoint not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          },
        )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      },
    )
  } catch (error) {
    console.error('API error:', error)
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