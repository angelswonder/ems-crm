import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <Card className="max-w-4xl w-full p-10 border-slate-700 bg-slate-900/90">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-slate-400 mt-2">
                Industrial EMS is committed to protecting your privacy and ensuring your data is used responsibly.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>

          <div className="space-y-5 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold mb-2">Information We Collect</h2>
              <p>
                We collect information you provide directly to us when you create an account, use our platform, or contact support. This includes your name, email address, organization details, and any other information required to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">How We Use Your Data</h2>
              <p>
                Data is used to manage your account, deliver services, improve product functionality, and communicate important updates. We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Security</h2>
              <p>
                We use industry standard practices to protect your personal information. Access to sensitive data is restricted to authorized personnel only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Cookies and Analytics</h2>
              <p>
                We may use cookies and analytics tools to optimize the website experience and monitor usage patterns. These technologies help us operate the service more effectively.
              </p>
            </section>
          </div>
        </div>
      </Card>
    </div>
  );
};
