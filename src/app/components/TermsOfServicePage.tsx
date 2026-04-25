import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <Card className="max-w-4xl w-full p-10 border-slate-700 bg-slate-900/90">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Terms of Service</h1>
              <p className="text-slate-400 mt-2">
                These terms govern your use of Industrial EMS and describe the relationship between you and the platform.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>

          <div className="space-y-5 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold mb-2">Account Registration</h2>
              <p>
                Users must provide accurate information when creating an account. Individual and organization accounts are subject to verification and acceptance by Industrial EMS.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Subscription and Billing</h2>
              <p>
                Paid plans require a valid payment method. Free plans are available for trial use. Upgrades, downgrades, and cancellations are subject to the applicable plan terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Acceptable Use</h2>
              <p>
                You agree to use Industrial EMS responsibly and not engage in fraudulent activity, unauthorized access, abuse of the service, or any behavior that harms other users or our infrastructure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Limitation of Liability</h2>
              <p>
                Industrial EMS is provided as-is. We are not liable for indirect or incidental damages arising from the use of the platform, except where prohibited by law.
              </p>
            </section>
          </div>
        </div>
      </Card>
    </div>
  );
};
