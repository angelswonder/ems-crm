import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
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
    const body = await req.json();
    const {
      name,
      slug,
      ownerUserId,
      ownerEmail,
      ownerFullName,
      planType = 'free',
    } = body || {};

    if (!name || !slug || !ownerUserId || !ownerEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(ownerUserId);
    if (authError || !authUser?.user) {
      console.error('Owner user lookup failed:', authError);
      return new Response(JSON.stringify({ error: 'Owner user not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([{
        name,
        slug,
        plan_type: planType,
        subscription_status: planType === 'free' ? 'active' : 'trialing',
        billing_email: ownerEmail,
      }])
      .select()
      .single();

    if (orgError || !org) {
      console.error('Organization creation failed:', orgError);
      return new Response(JSON.stringify({ error: 'Failed to create organization', details: orgError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profilePayload = {
      id: ownerUserId,
      org_id: org.id,
      full_name: ownerFullName || ownerEmail.split('@')[0] || 'Organization Admin',
      email: ownerEmail,
      role: 'owner',
      is_super_admin: false,
      theme_preference: 'dark',
      email_notifications: true,
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation failed:', profileError);
      return new Response(JSON.stringify({ error: 'Failed to create profile', details: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, org, profile }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Create organization error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
