import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ArrowLeft, Mail, Github, Chrome } from 'lucide-react';
import { toast } from 'sonner';

export const IndividualAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithPassword, signInWithOAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', { email, password, isSignUp, fullName });
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up - only create auth user, profile will be created on first sign in
        console.log('Attempting signup...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              user_type: 'individual'
            },
          },
        });

        if (error) {
          console.error('Signup error:', error);
          throw error;
        }

        console.log('Signup successful:', data);
        toast.success('Account created! Check your email to verify your account.');
        setIsSignUp(false); // Switch to sign in mode
      } else {
        // Sign in
        console.log('Attempting signin...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Signin error:', error);
          throw error;
        }

        console.log('Signin successful:', data);

        // Profile is created automatically by database trigger on signup
        // Just verify it exists
        if (data.user) {
          console.log('Checking profile...');
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (fetchError) {
            console.error('Profile fetch error:', fetchError);
            // Profile should have been created by trigger, but if not, this is an error
            toast.error('Profile not found. Please contact support.');
            return;
          }

          console.log('Profile verified:', existingProfile);
        }

        toast.success('Logged in successfully!');
        navigate('/individual/dashboard');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?user_type=individual`,
          scopes: provider === 'github' ? 'user:email' : undefined,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'OAuth login failed');
      setIsLoading(false);
    }
  };

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
          <h1 className="text-lg font-semibold">Individual Access</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-md">
          <div className="p-8">
            {/* Title */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-slate-400 text-sm">
                {isSignUp 
                  ? 'Join as an individual user' 
                  : 'Sign in to your account'}
              </p>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-slate-300">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading 
                  ? 'Processing...' 
                  : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-sm text-slate-400">or continue with</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* OAuth buttons */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={isLoading}
                variant="outline"
                className="w-full border-slate-600 hover:bg-slate-700/50 text-white gap-2"
              >
                <Chrome className="w-4 h-4" />
                Google
              </Button>
              <Button
                type="button"
                onClick={() => handleOAuth('github')}
                disabled={isLoading}
                variant="outline"
                className="w-full border-slate-600 hover:bg-slate-700/50 text-white gap-2"
              >
                <Github className="w-4 h-4" />
                GitHub
              </Button>
            </div>

            {/* Toggle sign up/in */}
            <div className="text-center">
              <p className="text-slate-400 text-sm">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-1 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>

            {/* Info section */}
            <div className="mt-8 pt-6 border-t border-slate-700/50">
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 text-sm text-blue-200">
                <p className="font-medium mb-2">✨ Individual User Benefits:</p>
                <ul className="space-y-1 text-blue-100/80">
                  <li>• Supervisor/Manager role access</li>
                  <li>• Personal dashboard & analytics</li>
                  <li>• Real-time monitoring</li>
                  <li>• Email & social media login</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default IndividualAuthPage;
