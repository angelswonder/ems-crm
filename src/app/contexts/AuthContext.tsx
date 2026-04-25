import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { User, AuthSession } from '@supabase/supabase-js';

const normalizeSupabaseUrl = (url: string) => {
  if (!url) return url;
  const cleaned = url.trim().replace(/\/+$|\s+$/g, '');

  try {
    const parsedUrl = new URL(cleaned);
    return `${parsedUrl.protocol}//${parsedUrl.host}`;
  } catch {
    return cleaned.replace(/\/(auth|rest)\/v1.*$/i, '');
  }
};

const supabase = createClient(
  normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || ''),
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

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
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  tenant: Tenant | null;
  session: AuthSession | null;
  loading: boolean;
  
  // Auth methods
  signUp: (email: string, password: string, fullName: string) => Promise<{ user: User | null; session: AuthSession | null }>;
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

  // Initialize auth state from Supabase
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          // Fetch user profile and tenant (tenant is null for individual users)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*, organizations(*)')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            // If no profile exists, don't set profile/tenant
          } else if (profileData) {
            setProfile({
              ...profileData,
              email: session.user.email || '',
            });
            // Only set tenant if org_id is not null
            setTenant(profileData.org_id ? profileData.organizations : null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setTenant(null);
      } else if (newSession?.user) {
        // Refetch profile on auth change
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, organizations(*)')
          .eq('id', newSession.user.id)
          .single();

        if (profileData) {
          setProfile({
            ...profileData,
            email: newSession.user.email || '',
          });
          // Only set tenant if org_id is not null
          setTenant(profileData.org_id ? profileData.organizations : null);
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
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

      if (error) throw error;

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

      if (orgError) throw orgError;

      // Create or upsert profile linking user to org
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: currentUserId,
          org_id: org.id,
          full_name: ownerFullName || user?.user_metadata?.full_name || '',
          role: 'owner', // Creator is owner
        }], { onConflict: 'id' });

      if (profileError) throw profileError;

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
