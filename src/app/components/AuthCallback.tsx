import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data.session?.user) {
          const user = data.session.user;
          const userType = new URLSearchParams(window.location.search).get('user_type');

          // Check if profile exists, create if not
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!existingProfile) {
            // Create profile based on user type
            const profileData = {
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              role: userType === 'individual' ? 'manager' : 'owner',
              org_id: userType === 'individual' ? null : null, // For org, will be set later
            };

            const { error: profileError } = await supabase
              .from('profiles')
              .insert([profileData]);

            if (profileError) {
              console.error('Profile creation error:', profileError);
              toast.error('Failed to create profile');
              return;
            }
          }

          // Navigate based on user type
          if (userType === 'individual') {
            navigate('/individual/dashboard');
          } else {
            navigate('/app');
          }

          toast.success('Logged in successfully!');
        } else {
          toast.error('Authentication failed');
          navigate('/');
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast.error('Authentication failed');
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p>Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;