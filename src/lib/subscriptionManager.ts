/**
 * Subscription Management Utilities
 * Handle subscription logic, trial logic, and billing cycles
 */

import { createClient } from '@supabase/supabase-js';
import type { Tenant } from '../contexts/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

/**
 * Check if organization is on trial
 */
export const isOnTrial = (tenant: Tenant | null): boolean => {
  if (!tenant) return false;
  return tenant.subscription_status === 'trialing';
};

/**
 * Check if subscription is active
 */
export const isSubscriptionActive = (tenant: Tenant | null): boolean => {
  if (!tenant) return false;
  return tenant.subscription_status === 'active';
};

/**
 * Check if subscription is past due
 */
export const isSubscriptionPastDue = (tenant: Tenant | null): boolean => {
  if (!tenant) return false;
  return tenant.subscription_status === 'past_due';
};

/**
 * Check if organization can use app
 */
export const canUseApp = (tenant: Tenant | null): boolean => {
  if (!tenant) return false;
  return isSubscriptionActive(tenant) || isOnTrial(tenant);
};

/**
 * Get days remaining in trial
 */
export const getDaysRemainingInTrial = (tenant: Tenant | null): number => {
  if (!tenant || !isOnTrial(tenant)) return 0;
  
  // Assume trial_ends_at is available
  const trialEnd = new Date((tenant as any).trial_ends_at);
  const now = new Date();
  const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysRemaining);
};

/**
 * Get trial expiration date
 */
export const getTrialExpirationDate = (tenant: Tenant | null): Date | null => {
  if (!tenant || !isOnTrial(tenant)) return null;
  return new Date((tenant as any).trial_ends_at);
};

/**
 * Get subscription plan price
 */
export const getSubscriptionPrice = (plan: string): number => {
  const prices: Record<string, number> = {
    free: 0,
    pro: 25,
    enterprise: 0, // Custom pricing
  };
  return prices[plan] || 0;
};

/**
 * Get remaining trial warning
 */
export const getTrialWarning = (tenant: Tenant | null): string | null => {
  if (!isOnTrial(tenant)) return null;

  const daysLeft = getDaysRemainingInTrial(tenant);

  if (daysLeft <= 0) {
    return '⚠️ Your trial has expired. Please upgrade to continue using EMS Tracker.';
  }

  if (daysLeft === 1) {
    return '⚠️ Your trial expires tomorrow! Upgrade now to avoid losing access.';
  }

  if (daysLeft <= 3) {
    return `⏰ Your trial expires in ${daysLeft} days. Upgrade to keep using all Pro features.`;
  }

  if (daysLeft <= 7) {
    return `Your trial expires in ${daysLeft} days.`;
  }

  return null;
};

/**
 * Get subscription status badge
 */
export const getSubscriptionStatusBadge = (tenant: Tenant | null): {
  label: string;
  color: string;
  icon: string;
} => {
  if (!tenant) {
    return { label: 'No Subscription', color: 'gray', icon: '❌' };
  }

  switch (tenant.subscription_status) {
    case 'active':
      return { label: 'Active', color: 'green', icon: '✅' };
    case 'trialing':
      return { label: 'On Trial', color: 'blue', icon: '⏱️' };
    case 'past_due':
      return { label: 'Past Due', color: 'red', icon: '⚠️' };
    case 'canceled':
      return { label: 'Canceled', color: 'gray', icon: '❌' };
    default:
      return { label: 'Inactive', color: 'gray', icon: '❌' };
  }
};

/**
 * Calculate MRR (Monthly Recurring Revenue) for organization
 */
export const calculateOrgMRR = (tenant: Tenant | null): number => {
  if (!tenant || !isSubscriptionActive(tenant)) return 0;
  
  const price = getSubscriptionPrice(tenant.plan_type);
  return price;
};

/**
 * Create billing portal session (for future use with Stripe)
 */
export const createBillingPortalSession = async (tenantId: string): Promise<string> => {
  try {
    // Call Edge Function to create Stripe billing portal session
    const { data, error } = await supabase.functions.invoke('stripe-billing-portal', {
      body: { org_id: tenantId },
    });

    if (error) throw error;
    return data.url;
  } catch (error) {
    console.error('Billing portal error:', error);
    throw error;
  }
};

/**
 * Get subscription renewal date
 */
export const getSubscriptionRenewalDate = async (tenantId: string): Promise<Date | null> => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('next_billing_date')
      .eq('org_id', tenantId)
      .single();

    if (error || !data) return null;

    return new Date(data.next_billing_date);
  } catch (error) {
    console.error('Error fetching renewal date:', error);
    return null;
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (tenantId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_status: 'canceled' })
      .eq('id', tenantId);

    if (error) throw error;

    // Log cancellation
    await supabase
      .from('audit_logs')
      .insert({
        org_id: tenantId,
        action: 'subscription_canceled',
        resource_type: 'subscription',
      });

    return true;
  } catch (error) {
    console.error('Cancellation error:', error);
    return false;
  }
};

/**
 * Get billing history for organization
 */
export const getBillingHistory = async (tenantId: string) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', tenantId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Billing history error:', error);
    return [];
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
};

/**
 * Get subscription summary for display
 */
export const getSubscriptionSummary = (tenant: Tenant | null): {
  plan: string;
  status: string;
  price: string;
  renewalDate?: string;
  daysUntilRenewal?: number;
} => {
  if (!tenant) {
    return {
      plan: 'None',
      status: 'No subscription',
      price: 'N/A',
    };
  }

  const price = getSubscriptionPrice(tenant.plan_type);
  const summary = {
    plan: tenant.plan_type.toUpperCase(),
    status: tenant.subscription_status,
    price: price > 0 ? formatPrice(price) + '/month' : 'Free',
  };

  return summary;
};
