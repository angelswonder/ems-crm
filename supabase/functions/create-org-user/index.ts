import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { email, password, full_name, role, org_id } = await req.json()

    if (!email || !password || !full_name || !role || !org_id) {
      throw new Error('Missing required fields: email, password, full_name, role, org_id')
    }

    // Map role to profile role (handle variations)
    const profileRole = 
      role === 'team-leader' || role === 'team_leader' ? 'member' :
      role === 'supervisor' || role === 'project_supervisor' ? 'member' :
      role === 'manager' ? 'member' :
      role === 'admin' ? 'admin' :
      'member'

    // Create auth user with service role
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role,
        org_id,
      },
    })

    if (authError) {
      throw new Error(`Auth user creation failed: ${authError.message}`)
    }

    const userId = authData.user.id

    // Create profile entry for this user
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        org_id,
        full_name,
        email,
        role: profileRole,
        theme_preference: 'dark',
        email_notifications: true,
      })
      .select()
      .single()

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }

    return new Response(
      JSON.stringify({
        user: {
          id: userId,
          email,
          full_name,
          role,
          org_id,
        },
        profile: profileData,
        message: 'User created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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

