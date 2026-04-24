import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const verifyStripeSignature = async (payload: string, signature: string, secret: string) => {
  const parts = signature.split(',').map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith('t='));
  const signaturePart = parts.find((part) => part.startsWith('v1='));

  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.split('=')[1];
  const expected = signaturePart.split('=')[1];
  const signedPayload = `${timestamp}.${payload}`;

  const key = new TextEncoder().encode(secret);
  const data = new TextEncoder().encode(signedPayload);
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const hash = Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

  const tolerance = 5 * 60;
  const timestampNumber = Number(timestamp);
  if (Number.isNaN(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > tolerance) {
    return false;
  }

  return hash === expected;
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const body = await req.text();

  if (!signature || !webhookSecret) {
    console.error('Missing Stripe signature or webhook secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const isValid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!isValid) {
    console.error('Invalid Stripe signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    console.error('Failed to parse webhook payload', error);
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const eventType = payload.type;
    const data = payload.data?.object;

    if (eventType === 'checkout.session.completed') {
      const orgId = data?.metadata?.org_id;
      const plan = data?.metadata?.plan || 'pro';
      const subscriptionId = data?.subscription;
      const customerEmail = data?.customer_email;

      if (!orgId) {
        return new Response(JSON.stringify({ error: 'Missing org_id metadata' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      await supabase.from('organizations').update({
        plan_type: plan,
        subscription_status: 'active',
        stripe_customer_id: data?.customer || null,
        stripe_subscription_id: subscriptionId || null,
        updated_at: new Date().toISOString(),
      }).eq('id', orgId);

      await supabase.from('subscriptions').upsert({
        org_id: orgId,
        plan_type: plan,
        status: 'active',
        amount_per_month: 2500,
        currency: 'USD',
        payment_method: 'stripe',
        stripe_subscription_id: subscriptionId,
        last_payment_date: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        billing_period_start: new Date().toISOString(),
        billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'org_id',
      });

      await supabase.from('audit_logs').insert({
        org_id: orgId,
        action: 'subscription_activated',
        resource_type: 'subscription',
        change_details: {
          plan,
          stripe_subscription_id: subscriptionId,
        },
      });
    } else if (eventType === 'invoice.payment_failed') {
      const orgId = data?.metadata?.org_id;
      if (orgId) {
        await supabase.from('organizations').update({ subscription_status: 'past_due', updated_at: new Date().toISOString() }).eq('id', orgId);
        await supabase.from('audit_logs').insert({
          org_id: orgId,
          action: 'payment_failed',
          resource_type: 'subscription',
          change_details: { invoice_id: data?.id },
        });
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const subscriptionId = data?.id;
      if (subscriptionId) {
        const { data: org } = await supabase.from('organizations').select('id').eq('stripe_subscription_id', subscriptionId).single();
        if (org) {
          await supabase.from('organizations').update({ subscription_status: 'canceled', plan_type: 'free', updated_at: new Date().toISOString() }).eq('id', org.id);
          await supabase.from('audit_logs').insert({
            org_id: org.id,
            action: 'subscription_canceled',
            resource_type: 'subscription',
            change_details: { stripe_subscription_id: subscriptionId },
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Stripe webhook processing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
