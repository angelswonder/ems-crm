import React, { useState } from 'react';
import { Mail, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface MagicLinkFormProps {
  onSuccess?: () => void;
}

export const MagicLinkForm: React.FC<MagicLinkFormProps> = ({ onSuccess }) => {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithMagicLink(email);
      setSubmitted(true);
      setEmail('');
      toast.success('Check your email for the magic link!');
      onSuccess?.();
    } catch (error) {
      console.error('Magic link error:', error);
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
          <p className="text-slate-400">
            We've sent a magic link to <span className="font-medium text-white">{email}</span>
          </p>
        </div>
        <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4 text-left">
          <p className="text-sm text-slate-400 mb-3">
            <strong>What happens next?</strong>
          </p>
          <ul className="text-sm text-slate-400 space-y-2">
            <li>✓ Check your inbox for the email from noreply@ems-tracker.com</li>
            <li>✓ Click the "Sign In" button in the email</li>
            <li>✓ You'll be automatically signed in to EMS Tracker</li>
            <li>✓ No password needed!</li>
          </ul>
        </div>
        <p className="text-xs text-slate-500">
          Didn't receive the email? Check your spam folder or{' '}
          <button
            onClick={() => setSubmitted(false)}
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-slate-950 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          A magic link will be sent to this email address
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            Send Magic Link
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-950 text-slate-500">Or</span>
        </div>
      </div>

      <p className="text-center text-sm text-slate-400">
        Prefer a password?{' '}
        <button
          type="button"
          className="text-indigo-400 hover:text-indigo-300 font-medium"
        >
          Sign in with password
        </button>
      </p>
    </form>
  );
};

/**
 * Magic Link Signup Form
 */
interface MagicLinkSignupProps {
  onSuccess?: () => void;
}

export const MagicLinkSignup: React.FC<MagicLinkSignupProps> = ({ onSuccess }) => {
  const { signInWithMagicLink } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setLoading(true);

    try {
      // Store name in localStorage temporarily (will be moved to profile on success)
      localStorage.setItem('pending_full_name', fullName);
      
      await signInWithMagicLink(email);
      setSubmitted(true);
      toast.success('Check your email for the magic link!');
      onSuccess?.();
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to send signup link. Please try again.');
      localStorage.removeItem('pending_full_name');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Welcome, {fullName}!</h3>
          <p className="text-slate-400">
            Check your email at <span className="font-medium text-white">{email}</span> for your magic link
          </p>
        </div>
        <div className="bg-slate-900/50 border border-white/10 rounded-lg p-4 text-left">
          <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
            <li>Click the magic link in your email</li>
            <li>Create your organization</li>
            <li>Start managing your energy data</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Full Name
        </label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          className="w-full bg-slate-950 border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full bg-slate-950 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !email || !fullName}
        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending Link...
          </>
        ) : (
          <>
            Get Started
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        By signing up, you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  );
};
