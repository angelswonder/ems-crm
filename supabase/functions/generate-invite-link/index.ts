import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'POST') {
      const { email, org_id, role, invited_by } = await req.json()

      if (!email || !org_id || !role) {
        throw new Error('Missing required fields: email, org_id, role')
      }

      // Check if invitation already exists
      const { data: existingInvite } = await supabaseAdmin
        .from('invitations')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('org_id', org_id)
        .eq('status', 'pending')
        .single()

      if (existingInvite) {
        throw new Error('This email already has a pending invitation for this organization')
      }

      // Create invitation with auto-generated token
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .insert({
          email: email.toLowerCase(),
          org_id,
          role,
          status: 'pending',
          invited_by,
        })
        .select('id, token, created_at')
        .single()

      if (inviteError) {
        throw inviteError
      }

      // Generate the full invite link
      const inviteLink = `${Deno.env.get('VITE_APP_URL') || 'http://localhost:5173'}/accept-invite?token=${invitation.token}`

      return new Response(
        JSON.stringify({
          invitation: {
            id: invitation.id,
            token: invitation.token,
            link: inviteLink,
            email,
            role,
            created_at: invitation.created_at,
          },
          message: 'Invitation created successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
      }
    )
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
