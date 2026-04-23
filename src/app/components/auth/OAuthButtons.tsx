import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

export const OAuthButtons: React.FC = () => {
  const { signInWithOAuth } = useAuth();
  const [loading, setLoading] = React.useState<'google' | 'github' | null>(null);

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch (error) {
      console.error(`${provider} auth error:`, error);
      toast.error(`Failed to sign in with ${provider}`);
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Google OAuth */}
      <button
        onClick={() => handleOAuth('google')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 bg-slate-950 border border-white/10 hover:border-white/20 rounded-2xl py-4 px-6 text-white font-medium transition-all disabled:opacity-50"
      >
        {loading === 'google' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        {loading === 'google' ? 'Signing in...' : 'Continue with Google'}
      </button>

      {/* GitHub OAuth */}
      <button
        onClick={() => handleOAuth('github')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 bg-slate-950 border border-white/10 hover:border-white/20 rounded-2xl py-4 px-6 text-white font-medium transition-all disabled:opacity-50"
      >
        {loading === 'github' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.603-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.544 2.914 1.19.092-.926.35-1.556.636-1.913-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.270.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.817c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.195 20 14.442 20 10.017 20 4.484 15.522 0 10 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {loading === 'github' ? 'Signing in...' : 'Continue with GitHub'}
      </button>
    </div>
  );
};
