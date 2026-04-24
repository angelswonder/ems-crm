import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    duration: '14-day trial',
    features: {
      'Up to 100 leads': true,
      'Up to 3 team members': true,
      'Basic CRM features': true,
      'Email support': true,
      'Advanced analytics': false,
      'API access': false,
      'Custom integrations': false,
      'Priority support': false,
      'Unlimited leads': false,
    },
  },
  pro: {
    name: 'Pro',
    price: 25,
    description: 'For growing businesses',
    duration: '/month',
    features: {
      'Unlimited leads': true,
      'Up to 5 team members': true,
      'Advanced CRM features': true,
      'Email support': true,
      'Advanced analytics': true,
      'API access': true,
      'Custom integrations': true,
      'Priority support': false,
      'Dedicated account manager': false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: null,
    description: 'For large organizations',
    duration: 'Custom pricing',
    features: {
      'Unlimited everything': true,
      'Unlimited team members': true,
      'Full CRM features': true,
      'Phone & email support': true,
      'Advanced analytics': true,
      'API access': true,
      'Custom integrations': true,
      'Priority support': true,
      'Dedicated account manager': true,
    },
  },
};

interface SubscriptionPlansProps {
  showPricing?: boolean;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ showPricing = true }) => {
  const { tenant, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise' | null>(null);

  const isOwner = profile?.role === 'owner';
  const currentPlan = (tenant?.plan_type || 'free') as keyof typeof PRICING_PLANS;

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    if (!tenant || !isOwner) {
      toast.error('Only organization owner can upgrade');
      return;
    }

    if (plan === 'enterprise') {
      // For enterprise, show contact form or redirect to contact page
      window.open('https://ems-tracker.com/contact-sales', '_blank');
      return;
    }

    setLoading(true);
    setSelectedPlan(plan);

    try {
      const checkoutUrl = await createStripeCheckout(tenant.id, plan);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const createStripeCheckout = async (orgId: string, plan: 'pro'): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: {
        org_id: orgId,
        plan,
      },
    });

    if (error) throw error;
    return (data as any).checkout_url;
  };

  if (!showPricing) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Current Plan Info */}
      {tenant && (
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-2">Current Plan</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg capitalize">{currentPlan} Plan</p>
              <p className="text-indigo-300 text-sm">
                {tenant.subscription_status === 'trialing'
                  ? 'You are on a free trial'
                  : tenant.subscription_status === 'active'
                    ? 'Active subscription'
                    : 'No active subscription'}
              </p>
            </div>
            {currentPlan !== 'free' && (
              <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all">
                Manage Billing
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(PRICING_PLANS).map(([planKey, plan]) => (
          <div
            key={planKey}
            className={`rounded-2xl border transition-all relative overflow-hidden group ${
              planKey === currentPlan
                ? 'border-indigo-500 bg-slate-900'
                : planKey === 'pro'
                  ? 'border-white/10 bg-slate-900 hover:border-indigo-500/50'
                  : 'border-white/5 bg-slate-900/50 hover:border-white/10'
            }`}
          >
            {/* Recommended Badge */}
            {planKey === 'pro' && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                RECOMMENDED
              </div>
            )}

            {/* Current Plan Badge */}
            {planKey === currentPlan && (
              <div className="absolute top-0 left-0 bg-emerald-600 text-white px-4 py-1 text-xs font-bold rounded-br-lg">
                CURRENT PLAN
              </div>
            )}

            <div className="p-8">
              {/* Plan Header */}
              <h3 className="text-2xl font-black text-white mb-2">{plan.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

              {/* Price */}
              <div className="mb-6">
                {plan.price !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${plan.price}</span>
                    <span className="text-slate-400">{plan.duration}</span>
                  </div>
                ) : (
                  <div className="text-xl font-bold text-white">{plan.duration}</div>
                )}
              </div>

              {/* CTA Button */}
              {planKey === 'free' ? (
                <button
                  disabled={currentPlan === 'free'}
                  className="w-full py-3 mb-8 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentPlan === 'free' ? 'Your Current Plan' : 'Get Started'}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(planKey as 'pro' | 'enterprise')}
                  disabled={loading && selectedPlan === planKey}
                  className={`w-full py-3 mb-8 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                    planKey === 'pro'
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  } disabled:opacity-50`}
                >
                  {loading && selectedPlan === planKey ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : planKey === 'enterprise' ? (
                    'Contact Sales'
                  ) : currentPlan === planKey ? (
                    'Current Plan'
                  ) : (
                    'Upgrade Now'
                  )}
                </button>
              )}

              {/* Features List */}
              <div className="space-y-3 border-t border-white/10 pt-8">
                {Object.entries(plan.features).map(([feature, included]) => (
                  <div key={feature} className="flex items-center gap-3">
                    {included ? (
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 border border-white/20 rounded flex-shrink-0" />
                    )}
                    <span className={included ? 'text-white' : 'text-slate-500'}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ / Help Section */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h3>

        <div className="space-y-4">
          <details className="group cursor-pointer">
            <summary className="flex items-center justify-between text-white font-medium hover:text-indigo-400 transition-colors">
              Can I change my plan anytime?
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-slate-400 text-sm mt-2 ml-0">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately,
              and we'll prorate your billing.
            </p>
          </details>

          <details className="group cursor-pointer">
            <summary className="flex items-center justify-between text-white font-medium hover:text-indigo-400 transition-colors">
              What payment methods do you accept?
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-slate-400 text-sm mt-2 ml-0">
                  We accept all major credit cards through Stripe. For Enterprise,
              Is there a long-term contract?
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-slate-400 text-sm mt-2 ml-0">
              No contracts! All plans are month-to-month. You can cancel anytime, and we'll issue a
              refund for any unused portion of your subscription.
            </p>
          </details>

          <details className="group cursor-pointer">
            <summary className="flex items-center justify-between text-white font-medium hover:text-indigo-400 transition-colors">
              What happens after my free trial?
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-slate-400 text-sm mt-2 ml-0">
              Your trial gives you 14 days of Pro features. After that, you'll be downgraded to the Free
              plan unless you subscribe. No charges until you upgrade!
            </p>
          </details>
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-8 text-center">
        <AlertCircle className="w-6 h-6 text-indigo-400 mx-auto mb-3" />
        <h3 className="text-white font-bold mb-2">Have Questions About Pricing?</h3>
        <p className="text-slate-400 text-sm mb-4">
          Our team is here to help! Contact us for custom quotes or to learn more about enterprise features.
        </p>
        <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all">
          Contact Sales
        </button>
      </div>
    </div>
  );
};
