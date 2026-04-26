import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('Completing authentication...');
  const [statusType, setStatusType] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        let sessionResponse;
        if ((supabase.auth as any).getSessionFromUrl) {
          sessionResponse = await (supabase.auth as any).getSessionFromUrl();
        }

        const session = sessionResponse?.data?.session || (await supabase.auth.getSession()).data.session;
        const query = new URLSearchParams(window.location.search);
        const actionType = query.get('type');
        const userType = query.get('user_type');

        if (session) {
          if (userType === 'individual' || actionType === 'signup') {
            navigate('/individual/dashboard');
          } else {
            navigate('/app');
          }

          toast.success('Logged in successfully!');
          return;
        }

        if (actionType === 'signup' || actionType === 'verify') {
          setStatusType('success');
          setStatusMessage('Your email has been verified successfully. Please sign in to continue.');
          return;
        }

        setStatusType('error');
        setStatusMessage('Authentication completed, but no active session was found. Please sign in again.');
      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatusType('error');
        setStatusMessage('Authentication failed. Please try signing in again.');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-slate-900/90 border border-slate-700 rounded-3xl p-10 text-white shadow-xl">
        <div className="text-center space-y-4">
          {statusType === 'loading' ? (
            <div className="mx-auto w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          ) : null}
          <h1 className="text-2xl font-bold">Authentication Status</h1>
          <p className={`text-sm ${statusType === 'error' ? 'text-red-300' : 'text-green-300'}`}>
            {statusMessage}
          </p>
          {statusType !== 'loading' ? (
            <button
              onClick={() => navigate('/auth/individual-login')}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              Go to sign in
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;