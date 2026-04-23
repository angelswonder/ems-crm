// supabase/functions/paystack-webhook/index.ts
// Handles Paystack payment notifications and updates subscription status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Verify Paystack signature
const verifyPaystackSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const crypto = await import('https://deno.land/std@0.208.0/crypto/mod.ts');
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const key = encoder.encode(secret);

  const hmac = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']),
    data
  );

  const hashArray = Array.from(new Uint8Array(hmac));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex === signature;
};

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }

  try {
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (!signature || !secret) {
      console.error('Missing signature or secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    // Verify the signature
    const isValid = await verifyPaystackSignature(body, signature, secret);
    if (!isValid) {
      console.error('Invalid signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
      });
    }

    const payload = JSON.parse(body);

    // Initialize Supabase Admin (service role to bypass RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle different Paystack events
    if (payload.event === 'charge.success') {
      const { reference, authorization, customer } = payload.data;

      // Extract org_id from metadata
      const orgId = payload.data.metadata?.org_id;
      const planType = payload.data.metadata?.plan || 'pro';

      if (!orgId) {
        console.error('No org_id in metadata');
        return new Response(JSON.stringify({ error: 'Missing org_id' }), {
          status: 400,
        });
      }

      // Update organization subscription status
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          plan_type: planType,
          paystack_customer_code: customer?.customer_code,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Create subscription record
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          org_id: orgId,
          plan_type: planType,
          status: 'active',
          amount_per_month: 2500, // $25 in cents
          currency: 'USD',
          payment_method: 'paystack',
          paystack_authorization_code: authorization?.authorization_code,
          last_payment_date: new Date().toISOString(),
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          billing_period_start: new Date().toISOString(),
          billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'org_id',
        });

      if (subError) {
        console.error('Subscription creation error:', subError);
        throw subError;
      }

      // Log to audit logs
      await supabase
        .from('audit_logs')
        .insert({
          org_id: orgId,
          action: 'subscription_activated',
          resource_type: 'subscription',
          change_details: {
            plan: planType,
            reference,
            amount: 2500,
          },
        });

      console.log(`✅ Subscription activated for org: ${orgId}`);
      return new Response(JSON.stringify({ success: true }), { status: 200 });

    } else if (payload.event === 'charge.failed') {
      const orgId = payload.data.metadata?.org_id;

      if (orgId) {
        // Update to past_due
        await supabase
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('id', orgId);

        console.log(`⚠️ Payment failed for org: ${orgId}`);
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });

    } else if (payload.event === 'subscription.disable') {
      const customer = payload.data.customer;

      // Find org by paystack customer code
      const { data: org, error: findError } = await supabase
        .from('organizations')
        .select('id')
        .eq('paystack_customer_code', customer?.customer_code)
        .single();

      if (org) {
        await supabase
          .from('organizations')
          .update({ subscription_status: 'canceled' })
          .eq('id', org.id);

        console.log(`❌ Subscription canceled for org: ${org.id}`);
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Acknowledge receipt of other events
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
});
