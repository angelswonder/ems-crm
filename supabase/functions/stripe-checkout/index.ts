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
    const { org_id, plan } = await req.json();

    if (!org_id || !plan) {
      return new Response(JSON.stringify({ error: 'Missing org_id or plan' }), {
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
      .select('id, name, billing_email')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (plan !== 'pro') {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173';

    if (!stripeSecret) {
      console.error('STRIPE_SECRET_KEY not set');
      return new Response(JSON.stringify({ error: 'Payment provider not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = new URLSearchParams();
    body.append('mode', 'subscription');
    body.append('payment_method_types[]', 'card');
    body.append('line_items[0][price_data][currency]', 'usd');
    body.append('line_items[0][price_data][product_data][name]', 'EMS Pro Plan');
    body.append('line_items[0][price_data][product_data][description]', 'Monthly Pro subscription for Industrial EMS');
    body.append('line_items[0][price_data][unit_amount]', '2500');
    body.append('line_items[0][quantity]', '1');
    body.append('success_url', `${appUrl}/?checkout=success`);
    body.append('cancel_url', `${appUrl}/?checkout=cancel`);
    body.append('customer_email', org.billing_email || '');
    body.append('metadata[org_id]', org_id);
    body.append('metadata[plan]', plan);
    body.append('subscription_data[trial_period_days]', '14');

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const stripeData = await stripeResponse.json();
    if (!stripeResponse.ok) {
      console.error('Stripe checkout error:', stripeData);
      return new Response(JSON.stringify({ error: 'Failed to initialize Stripe checkout' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('audit_logs').insert({
      org_id,
      action: 'subscription_checkout_initiated',
      resource_type: 'subscription',
      change_details: {
        plan,
        amount: 2500,
        stripe_session_id: stripeData.id,
      },
    });

    return new Response(JSON.stringify({ checkout_url: stripeData.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
