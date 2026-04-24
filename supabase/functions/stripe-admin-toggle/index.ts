import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { org_id, action } = await req.json();

    if (!org_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing org_id or action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, plan_type, subscription_status')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let updates: Record<string, unknown> = {};
    let auditAction = '';

    if (action === 'activate_pro') {
      updates = {
        plan_type: 'pro',
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      };
      auditAction = 'subscription_force_activated';
    } else if (action === 'deactivate_pro') {
      updates = {
        plan_type: 'free',
        subscription_status: 'inactive',
        updated_at: new Date().toISOString(),
      };
      auditAction = 'subscription_force_deactivated';
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: updateError } = await supabase.from('organizations').update(updates).eq('id', org_id);
    if (updateError) {
      console.error('Organization update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update organization' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('audit_logs').insert({
      org_id,
      action: auditAction,
      resource_type: 'subscription',
      change_details: {
        new_plan: updates.plan_type,
        new_status: updates.subscription_status,
        triggered_by: 'super-admin',
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe admin toggle error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
