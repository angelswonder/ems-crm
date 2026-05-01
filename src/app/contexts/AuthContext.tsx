import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';
import type { User, AuthSession } from '@supabase/supabase-js';

const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_type: 'free' | 'pro' | 'enterprise';
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled';
}

export interface UserProfile {
  id: string;
  org_id: string | null; // Allow null for individual users
  full_name: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'manager'; // Add manager for individuals
  email: string;
  theme_preference: 'light' | 'dark';
  email_notifications: boolean;
  is_super_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  tenant: Tenant | null;
  session: AuthSession | null;
  loading: boolean;
  
  // Auth methods
  signUp: (email: string, password: string, fullName: string, userType?: string) => Promise<{ user: User | null; session: AuthSession | null }>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Organization
  createOrganization: (name: string, slug: string, ownerUserId?: string, ownerEmail?: string, ownerFullName?: string, planType?: 'free' | 'pro' | 'enterprise') => Promise<Tenant>;
  switchOrganization: (tenantId: string) => Promise<void>;
  
  // Profile
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadUserProfile = async (supabaseUser: User) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, organizations(*)')
        .eq('id', supabaseUser.id)
        .single();

      if (profileError) {
        console.warn('Error fetching profile:', profileError);
        if (supabaseUser.user_metadata?.user_type === 'individual') {
          setProfile({
            id: supabaseUser.id,
            org_id: null,
            full_name: supabaseUser.user_metadata?.full_name || 'User',
            avatar_url: supabaseUser.user_metadata?.avatar_url,
            role: 'manager',
            email: supabaseUser.email || '',
            theme_preference: 'dark',
            email_notifications: true,
            is_super_admin: false,
          });
          setTenant(null);
        }
      } else if (profileData) {
        setProfile({
          ...profileData,
          email: supabaseUser.email || '',
          is_super_admin: profileData.is_super_admin || false,
        });
        setTenant(profileData.org_id ? profileData.organizations : null);
      }
    } catch (error) {
      console.error('Profile load error:', error);
    }
  };

  // Initialize auth state from Supabase
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!supabase) {
          console.warn('Supabase is not configured; skipping auth initialization.');
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    let subscription: { unsubscribe: () => void } | undefined;

    if (supabase) {
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        console.log('Auth state changed:', event, 'User:', newSession?.user?.id);
        setSession(newSession);
        setUser(newSession?.user || null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setTenant(null);
          localStorage.removeItem('currentTenantId');
          localStorage.removeItem('auth_token');
          sessionStorage.clear();
        }

        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') && newSession?.user) {
          await loadUserProfile(newSession.user);
        }
      });

      subscription = authSubscription;
    }

    return () => subscription?.unsubscribe();
  }, []);

  // Session timeout mechanism - automatically log out after 24 hours of inactivity
  useEffect(() => {
    const resetSessionTimeout = () => {
      // Clear existing timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }

      // Only set timeout if user is logged in
      if (user) {
        sessionTimeoutRef.current = setTimeout(async () => {
          console.log('Session timeout - logging out user');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setTenant(null);
        }, 24 * 60 * 60 * 1000); // 24 hours
      }
    };

    resetSessionTimeout();

    // Reset timeout on user activity
    const handleUserActivity = () => {
      resetSessionTimeout();
    };

    if (user) {
      window.addEventListener('mousedown', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
    }

    return () => {
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [user]);

  const signUp = useCallback(async (email: string, password: string, fullName: string, userType: string = 'individual') => {
    try {
      console.log('Starting signup:', { email, fullName, userType });
      
      // Use production URL for Vercel deployment, fallback to current origin
      const baseUrl = import.meta.env.PROD 
        ? 'https://ems-crm.vercel.app' 
        : window.location.origin;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`,
          data: {
            full_name: fullName,
            user_type: userType,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      console.log('Signup successful:', { userId: data?.user?.id, hasSession: !!data?.session });

      if (data?.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
      }

      return {
        user: data?.user || null,
        session: data?.session || null,
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data?.session?.user) {
        setSession(data.session);
        setUser(data.session.user);
        await loadUserProfile(data.session.user);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      // Use production URL for Vercel deployment, fallback to current origin
      const baseUrl = import.meta.env.PROD 
        ? 'https://ems-crm.vercel.app' 
        : window.location.origin;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${baseUrl}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Magic link error:', error);
      throw error;
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('OAuth error:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all auth-related state and localStorage
      setSession(null);
      setUser(null);
      setProfile(null);
      setTenant(null);
      localStorage.removeItem('currentTenantId');
      localStorage.removeItem('auth_token');
      sessionStorage.clear();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }, []);

  const createOrganization = useCallback(async (
    name: string,
    slug: string,
    ownerUserId?: string,
    ownerEmail?: string,
    ownerFullName?: string,
    planType: 'free' | 'pro' | 'enterprise' = 'free'
  ): Promise<Tenant> => {
    const currentUserId = ownerUserId || user?.id;
    if (!currentUserId) throw new Error('User not authenticated');

    try {
      console.log('Creating organization:', { name, slug, currentUserId });
      
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name,
          slug,
          plan_type: planType,
          subscription_status: planType === 'free' ? 'active' : 'trialing',
          billing_email: ownerEmail || user?.email,
        }])
        .select()
        .single();

      if (orgError) {
        console.error('Organization insert failed:', orgError);
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      console.log('Organization created:', org.id);

      // Create or upsert profile linking user to org
      console.log('Updating profile with org_id:', org.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: currentUserId,
          org_id: org.id,
          full_name: ownerFullName || user?.user_metadata?.full_name || '',
          role: 'owner',
          email: ownerEmail || user?.email || '',
        }], { onConflict: 'id' })
        .select()
        .single();

      if (profileError) {
        console.error('Profile upsert failed:', profileError);
        throw new Error(`Failed to link profile to organization: ${profileError.message}`);
      }

      console.log('Profile updated successfully');

      // Update local state
      setTenant(org as Tenant);

      return org as Tenant;
    } catch (error) {
      console.error('Organization creation error:', error);
      throw error;
    }
  }, [user]);

  const switchOrganization = useCallback(async (tenantId: string) => {
    try {
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;

      setTenant(orgData as Tenant);
      // Store in localStorage for quick access
      localStorage.setItem('currentTenantId', tenantId);
    } catch (error) {
      console.error('Organization switch error:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    profile,
    tenant,
    session,
    loading,
    signUp,
    signInWithPassword,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
    resetPassword,
    createOrganization,
    switchOrganization,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
