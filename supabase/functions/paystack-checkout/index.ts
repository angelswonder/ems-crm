// supabase/functions/paystack-checkout/index.ts
// Creates a Paystack checkout session for subscription upgrades

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // CORS headers
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
      return new Response(
        JSON.stringify({ error: 'Missing org_id or plan' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, billing_email')
      .eq('id', org_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Plan pricing
    const plans = {
      pro: {
        amount: 2500, // $25 in cents
        interval: 'monthly',
      },
    };

    const selectedPlan = plans[plan as keyof typeof plans];
    if (!selectedPlan) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Paystack initialization payload
    const paystackPayload = {
      email: org.billing_email,
      amount: selectedPlan.amount,
      metadata: {
        org_id,
        plan,
        company_name: org.name,
      },
    };

    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) {
      console.error('PAYSTACK_SECRET_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Payment provider not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call Paystack API to initialize transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    if (!paystackResponse.ok) {
      const error = await paystackResponse.json();
      console.error('Paystack error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize payment' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paystackData = await paystackResponse.json();

    // Log the checkout attempt
    await supabase
      .from('audit_logs')
      .insert({
        org_id,
        action: 'subscription_checkout_initiated',
        resource_type: 'subscription',
        change_details: {
          plan,
          amount: selectedPlan.amount,
          reference: paystackData.data.reference,
        },
      });

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
