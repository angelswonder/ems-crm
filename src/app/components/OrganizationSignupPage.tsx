import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ArrowLeft, Building2, Mail, Lock, User, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { paymentService, PaymentPlan } from '../../utils/payment';

export const OrganizationSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, createOrganization } = useAuth();
  const [step, setStep] = useState<'details' | 'payment' | 'complete'>('details');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);

  // Form data
  const [orgData, setOrgData] = useState({
    name: '',
    slug: '',
    adminEmail: '',
    adminName: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateDetails = () => {
    const errs: Record<string, string> = {};

    if (!orgData.name.trim()) errs.name = 'Organization name is required';
    if (!orgData.slug.trim()) errs.slug = 'Organization slug is required';
    if (!orgData.adminEmail.trim()) errs.adminEmail = 'Admin email is required';
    if (!orgData.adminName.trim()) errs.adminName = 'Admin name is required';
    if (!orgData.password.trim()) errs.password = 'Password is required';
    if (orgData.password.length < 6) errs.password = 'Password must be at least 6 characters';

    // Validate slug format
    if (orgData.slug && !/^[a-z0-9-]+$/.test(orgData.slug)) {
      errs.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetails()) return;

    setIsLoading(true);
    try {
      // Check if organization slug is available
      // For now, we'll assume it's available and proceed to completion
      // Skip payment step - set to free plan
      setSelectedPlan({ id: 'free', name: 'Free', price: 0, features: [] });
      setStep('complete');
    } catch (error: any) {
      toast.error('Error validating organization details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSubmit = async () => {
    setIsLoading(true);
    try {
      const signUpResult = await signUp(orgData.adminEmail, orgData.password, orgData.adminName);
      const ownerId = signUpResult.user?.id;

      if (!ownerId) {
        throw new Error('Unable to create your account. Please check your email verification status before continuing.');
      }

      await createOrganization(
        orgData.name,
        orgData.slug,
        ownerId,
        'free' // Set to free plan
      );

      toast.success('Organization created successfully!');
      navigate('/app');
    } catch (error: any) {
      console.error('Organization creation error:', error);
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  };

  const renderDetailsStep = () => (
    <form onSubmit={handleDetailsSubmit} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Create Your Organization</h2>
        <p className="text-slate-400">Set up your team workspace and start your free trial</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Organization Name
          </label>
          <Input
            type="text"
            placeholder="Acme Corporation"
            value={orgData.name}
            onChange={(e) => setOrgData(prev => ({ ...prev, name: e.target.value }))}
            disabled={isLoading}
            className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
            required
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Organization URL Slug
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 bg-slate-800 border border-r-0 border-slate-600 rounded-l-lg text-slate-400 text-sm">
              app.ems-tracker.com/
            </span>
            <Input
              type="text"
              placeholder="acme-corp"
              value={orgData.slug}
              onChange={(e) => setOrgData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              disabled={isLoading}
              className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500 rounded-l-none"
              required
            />
          </div>
          {errors.slug && <p className="text-red-400 text-sm mt-1">{errors.slug}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Admin Full Name
          </label>
          <Input
            type="text"
            placeholder="John Doe"
            value={orgData.adminName}
            onChange={(e) => setOrgData(prev => ({ ...prev, adminName: e.target.value }))}
            disabled={isLoading}
            className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
            required
          />
          {errors.adminName && <p className="text-red-400 text-sm mt-1">{errors.adminName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Admin Email
          </label>
          <Input
            type="email"
            placeholder="admin@acme.com"
            value={orgData.adminEmail}
            onChange={(e) => setOrgData(prev => ({ ...prev, adminEmail: e.target.value }))}
            disabled={isLoading}
            className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
            required
          />
          {errors.adminEmail && <p className="text-red-400 text-sm mt-1">{errors.adminEmail}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Password
          </label>
          <Input
            type="password"
            placeholder="••••••••"
            value={orgData.password}
            onChange={(e) => setOrgData(prev => ({ ...prev, password: e.target.value }))}
            disabled={isLoading}
            className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
            required
            minLength={6}
          />
          {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
      >
        {isLoading ? 'Creating...' : 'Create Organization'}
      </Button>
    </form>
  );

  const renderPaymentStep = () => {
    const plans = paymentService.getPlans();
    const isPaymentConfigured = paymentService.isConfigured();

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
          <p className="text-slate-400">
            {isPaymentConfigured
              ? 'Start with a 14-day free trial, no credit card required'
              : 'Payment service not configured - contact support for paid plans'
            }
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 border-2 transition-all duration-300 cursor-pointer ${
                selectedPlan?.id === plan.id
                  ? plan.id === 'pro'
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-green-500 bg-green-900/20'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
              }`}
              onClick={() => setSelectedPlan(plan)}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-4">
                  ${plan.price}
                  <span className="text-lg font-normal">/{plan.interval}</span>
                </div>
                <ul className="text-sm text-slate-300 space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan);
                    handlePaymentSubmit();
                  }}
                  disabled={isLoading || (plan.id !== 'free' && !isPaymentConfigured)}
                  className={`w-full ${
                    plan.id === 'free'
                      ? 'bg-slate-600 hover:bg-slate-700'
                      : plan.id === 'pro'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isLoading ? 'Processing...' :
                   plan.id === 'free' ? 'Start Free Trial' :
                   plan.id === 'enterprise' ? 'Contact Sales' :
                   `Start ${plan.name} Trial`}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {selectedPlan && (
          <div className="text-center">
            <Button
              onClick={handlePaymentSubmit}
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Processing Payment...' : `Continue with ${selectedPlan.name} Plan`}
            </Button>
          </div>
        )}

        {!isPaymentConfigured && (
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-400">Payment Service Not Configured</h4>
                <p className="text-sm text-yellow-300 mt-1">
                  Paid plans are currently unavailable. Only the free plan can be used.
                  Contact support to enable payment processing.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center text-sm text-slate-400">
          <p>✓ No credit card required for trial</p>
          <p>✓ Cancel anytime during trial period</p>
          <p>✓ Upgrade/downgrade at any time</p>
        </div>
      </div>
    );
  };

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">Organization Created!</h2>
        <p className="text-slate-400">Welcome to Industrial EMS. Your workspace is ready.</p>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-6 text-left">
        <h3 className="font-semibold mb-4">What's Next:</h3>
        <ul className="text-sm text-slate-300 space-y-2">
          <li>✓ Organization: <strong>{orgData.name}</strong></li>
          <li>✓ URL: <strong>app.ems-tracker.com/{orgData.slug}</strong></li>
          <li>✓ Admin: <strong>{orgData.adminEmail}</strong></li>
          <li>○ Invite team members</li>
          <li>○ Set up your first energy monitor</li>
          <li>○ Configure CRM settings</li>
        </ul>
      </div>
      <p className="text-sm text-slate-400">Redirecting to your dashboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">Organization Setup</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Progress indicator */}
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-8">
          <div className={`flex items-center ${step === 'details' ? 'text-blue-400' : step === 'complete' ? 'text-green-400' : 'text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 'details' ? 'bg-blue-600' : step === 'complete' ? 'bg-green-600' : 'bg-slate-700'}`}>
              1
            </div>
            <span className="ml-2 text-sm">Details</span>
          </div>
          <div className="flex-1 h-px bg-slate-700 mx-4" />
          <div className={`flex items-center ${step === 'complete' ? 'text-green-400' : 'text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 'complete' ? 'bg-green-600' : 'bg-slate-700'}`}>
              2
            </div>
            <span className="ml-2 text-sm">Complete</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-md">
          <div className="p-8">
            {step === 'details' && renderDetailsStep()}
            {step === 'complete' && renderCompleteStep()}
          </div>
        </Card>
      </main>
    </div>
  );
};