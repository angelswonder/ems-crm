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
    const { action = 'lookup', token, access_token } = body || {};

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing invitation token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('id, org_id, email, role, status, expires_at, created_at, updated_at, accepted_at, accepted_by, organizations(name)')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    if (invitation.expires_at && new Date(invitation.expires_at) < now) {
      return new Response(JSON.stringify({ error: 'Invitation has expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'lookup') {
      return new Response(JSON.stringify({
        invitation: {
          id: invitation.id,
          org_id: invitation.org_id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          org_name: invitation.organizations?.name || null,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'accept') {
      if (!access_token) {
        return new Response(JSON.stringify({ error: 'Access token required to accept invitation' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getUser(access_token);
      if (sessionError || !sessionData?.user) {
        return new Response(JSON.stringify({ error: 'Unable to verify signed-in user' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const user = sessionData.user;
      if (user.email?.toLowerCase() !== invitation.email?.toLowerCase()) {
        return new Response(JSON.stringify({ error: 'Signed-in email does not match invitation email' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (invitation.status !== 'pending') {
        return new Response(JSON.stringify({ error: 'Invitation is not pending and cannot be accepted' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const profilePayload = {
        id: user.id,
        org_id: invitation.org_id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        role: invitation.role,
        theme_preference: 'dark',
        email_notifications: true,
      };

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        return new Response(JSON.stringify({ error: 'Failed to update profile after accepting invitation', details: profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: updatedInvitation, error: updatedInvitationError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('id', invitation.id)
        .select()
        .single();

      if (updatedInvitationError || !updatedInvitation) {
        return new Response(JSON.stringify({ error: 'Failed to mark invitation as accepted' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, invitation: updatedInvitation, profile: profileData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Accept invite function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
