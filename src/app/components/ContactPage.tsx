import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';

export const ContactPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <Card className="max-w-3xl w-full p-10 border-slate-700 bg-slate-900/90">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Contact Us</h1>
              <p className="text-slate-400 mt-2">
                Need support or have questions about Industrial EMS? Reach out and we&apos;ll get back to you quickly.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>

          <div className="space-y-5 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold mb-2">Support</h2>
              <p>
                For product questions, technical support, and onboarding assistance, email us at{' '}
                <a href="mailto:support@industrial-ems.com" className="text-blue-300 hover:text-blue-200">
                  support@industrial-ems.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">Sales</h2>
              <p>
                Interested in enterprise plans or custom integrations? Contact our sales team at{' '}
                <a href="mailto:sales@industrial-ems.com" className="text-blue-300 hover:text-blue-200">
                  sales@industrial-ems.com
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-2">General Inquiries</h2>
              <p>
                You can also reach us via our contact form on the website, or send a note to{' '}
                <a href="mailto:info@industrial-ems.com" className="text-blue-300 hover:text-blue-200">
                  info@industrial-ems.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </Card>
    </div>
  );
};
