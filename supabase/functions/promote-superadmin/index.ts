import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);

    if (authError || !authUser.user) {
      console.error('User lookup error:', authError);
      return new Response(JSON.stringify({ error: 'User not found in auth.users' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the profile to make them super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        is_super_admin: true,
        role: 'owner',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)
      .select()
      .single();

    if (profileError) {
      console.error('Profile update error:', profileError);
      return new Response(JSON.stringify({
        error: 'Failed to update profile',
        details: profileError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the super admin promotion
    await supabase.from('audit_logs').insert({
      user_id: user_id,
      action: 'user_promoted_to_super_admin',
      resource_type: 'user',
      resource_id: user_id,
      change_details: {
        promoted_by: 'system_admin',
        new_role: 'super_admin',
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`User ${user_id} promoted to super admin successfully`);

    return new Response(JSON.stringify({
      success: true,
      message: 'User promoted to super admin successfully',
      user: {
        id: user_id,
        email: authUser.user.email,
        profile: profile,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Super admin promotion error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});