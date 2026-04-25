export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
  paystackPlanCode?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class PaymentService {
  private stripePromise: Promise<any> | null = null;
  private provider: 'stripe' | 'paystack' = 'stripe';

  constructor() {
    // Determine provider from environment or default to stripe
    this.provider = (import.meta.env.VITE_PAYMENT_PROVIDER as 'stripe' | 'paystack') || 'stripe';
  }

  private async getStripe() {
    if (!this.stripePromise) {
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!stripeKey) {
        throw new Error('Stripe publishable key not configured');
      }
      const stripeModule = await import('@stripe/stripe-js');
      this.stripePromise = stripeModule.loadStripe(stripeKey);
    }
    return this.stripePromise;
  }

  private getPaystackConfig() {
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackKey) {
      throw new Error('Paystack public key not configured');
    }
    return { key: paystackKey };
  }

  async createSubscription(plan: PaymentPlan, customerEmail: string, customerName: string): Promise<PaymentResult> {
    try {
      if (this.provider === 'stripe') {
        return await this.createStripeSubscription(plan, customerEmail, customerName);
      } else {
        return await this.createPaystackSubscription(plan, customerEmail, customerName);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      return {
        success: false,
        error: error.message || 'Payment failed'
      };
    }
  }

  private async createStripeSubscription(plan: PaymentPlan, customerEmail: string, customerName: string): Promise<PaymentResult> {
    const stripe = await this.getStripe();
    if (!stripe) {
      throw new Error('Stripe failed to load');
    }

    if (!plan.stripePriceId) {
      throw new Error('Stripe price ID not configured for this plan');
    }

    // Create checkout session (you would typically do this on the server)
    // For now, we'll simulate the payment process
    console.log('Creating Stripe subscription:', {
      plan: plan.name,
      price: plan.price,
      customerEmail,
      customerName
    });

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      transactionId: `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private async createPaystackSubscription(plan: PaymentPlan, customerEmail: string, customerName: string): Promise<PaymentResult> {
    // Paystack browser checkout is intentionally not implemented in this client-only version.
    // For a live production integration, move Paystack checkout creation to a secure server / Cloudflare Worker,
    // then redirect the user to the hosted authorization URL.
    throw new Error('Paystack client integration is not configured. Use Stripe or implement server-side Paystack checkout.');
  }

  // Get available plans
  getPlans(): PaymentPlan[] {
    return [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: [
          'Up to 3 team members',
          'Basic analytics',
          '14-day trial',
          'Community support'
        ],
        stripePriceId: 'price_free_trial',
        paystackPlanCode: 'PLN_free_trial'
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 29,
        currency: 'USD',
        interval: 'month',
        features: [
          'Up to 25 team members',
          'Advanced analytics',
          'Custom reports',
          'Priority support',
          'API access'
        ],
        stripePriceId: 'price_pro_monthly',
        paystackPlanCode: 'PLN_pro_monthly'
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99,
        currency: 'USD',
        interval: 'month',
        features: [
          'Unlimited team members',
          'All Pro features',
          'Advanced integrations',
          'Dedicated support',
          'Custom SLA'
        ],
        stripePriceId: 'price_enterprise_monthly',
        paystackPlanCode: 'PLN_enterprise_monthly'
      }
    ];
  }

  // Check if payment is configured
  isConfigured(): boolean {
    if (this.provider === 'stripe') {
      return !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    } else {
      return !!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    }
  }

  getProvider(): 'stripe' | 'paystack' {
    return this.provider;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();