import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowRight, Zap, Users, BarChart3, Lock, Clock, Globe } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<'individual' | 'organization' | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Background animation elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">Industrial EMS</h1>
          </div>
          <div className="text-sm text-slate-400">
            Energy Management & CRM
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Hero section */}
        <div className="text-center mb-16 sm:mb-24">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent leading-tight">
            Welcome to Industrial EMS
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Choose your path and get started with our comprehensive energy management and customer relationship platform
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Globe className="w-4 h-4" /> Multi-tenant ready
            </span>
            <span className="flex items-center gap-1 ml-4">
              <Lock className="w-4 h-4" /> Secure & Compliant
            </span>
            <span className="flex items-center gap-1 ml-4">
              <Clock className="w-4 h-4" /> Real-time analytics
            </span>
          </div>
        </div>

        {/* Cards section */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Individual card */}
          <div
            onMouseEnter={() => setHoveredCard('individual')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group"
          >
            <Card className={`h-full p-8 border-2 transition-all duration-300 cursor-pointer backdrop-blur-md ${
              hoveredCard === 'individual'
                ? 'border-blue-400 bg-blue-900/20 shadow-lg shadow-blue-500/20'
                : hoveredCard === 'organization'
                ? 'border-slate-600 bg-slate-800/10'
                : 'border-slate-700 bg-slate-800/20 hover:border-blue-400/50'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Individual User</h3>
                  <p className="text-slate-400">For solo professionals</p>
                </div>
                <div className="w-14 h-14 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/40 transition-colors">
                  <Users className="w-7 h-7 text-blue-400" />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-slate-300 leading-relaxed">
                  Personal account to manage energy systems and track projects independently. Perfect for consultants, supervisors, and managers.
                </p>
                
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                    <span>Supervisor/Manager role access</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                    <span>Email & social media login</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                    <span>Personal dashboard & analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                    <span>Real-time monitoring & reports</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => navigate('/auth/individual-login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white group/btn flex items-center justify-center gap-2 transition-all"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>

              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 text-center">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('/auth/individual-login')}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Sign in here
                  </button>
                </p>
                <p className="text-xs text-slate-500 text-center mt-1">
                  No credit card required • Instant access
                </p>
              </div>
            </Card>
          </div>

          {/* Organization card */}
          <div
            onMouseEnter={() => setHoveredCard('organization')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative"
          >
            {/* "RECOMMENDED" badge */}
            <div className="absolute -top-4 right-6 z-20">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                RECOMMENDED
              </div>
            </div>

            <Card className={`h-full p-8 border-2 transition-all duration-300 cursor-pointer backdrop-blur-md ${
              hoveredCard === 'organization'
                ? 'border-purple-400 bg-purple-900/20 shadow-lg shadow-purple-500/20'
                : hoveredCard === 'individual'
                ? 'border-slate-600 bg-slate-800/10'
                : 'border-slate-700 bg-slate-800/20 hover:border-purple-400/50'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Organization</h3>
                  <p className="text-slate-400">For teams & enterprises</p>
                </div>
                <div className="w-14 h-14 bg-purple-600/20 rounded-lg flex items-center justify-center group-hover:bg-purple-600/40 transition-colors">
                  <BarChart3 className="w-7 h-7 text-purple-400" />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-slate-300 leading-relaxed">
                  Powerful multi-tenant SaaS platform for managing entire organizations. Includes team management, billing, and enterprise features.
                </p>

                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                    <span>Complete team management & roles</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                    <span>Subscription & billing system</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                    <span>Advanced analytics & reporting</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="w-2 h-2 bg-white rounded-full" />
                    </span>
                    <span>Enterprise security & compliance</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={() => navigate('/auth/organization-signup')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white group/btn flex items-center justify-center gap-2 transition-all"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>

              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 text-center">                  Already have an organization?{' '}
                  <button
                    onClick={() => navigate('/auth/organization-login')}
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Sign in here
                  </button>
                </p>
                <p className="text-xs text-slate-500 text-center mt-1">                  Free 14-day trial • No credit card required
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Features section */}
        <div className="mt-24 pt-16 border-t border-slate-700/50">
          <h3 className="text-3xl font-bold text-center mb-12">
            Powerful Features for Everyone
          </h3>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Lightning Fast",
                description: "Instant access to your data with real-time updates and zero downtime"
              },
              {
                icon: <Lock className="w-8 h-8" />,
                title: "Bank-Level Security",
                description: "Enterprise-grade encryption and compliance with industry standards"
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: "Global Infrastructure",
                description: "Deployed on CDN for instant access from anywhere in the world"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="text-center p-6 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors"
              >
                <div className="w-14 h-14 bg-blue-600/20 rounded-lg flex items-center justify-center mx-auto mb-4 text-blue-400">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-semibold mb-2">{feature.title}</h4>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700/50 mt-24 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
            <p>&copy; 2026 Industrial EMS. All rights reserved.</p>
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => navigate('/privacy')}
                className="hover:text-slate-300 transition-colors"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => navigate('/terms')}
                className="hover:text-slate-300 transition-colors"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="hover:text-slate-300 transition-colors"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS for animations */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
