import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';
import { Card } from './ui/card';
import { ArrowLeft, Users, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

export const DebugPage: React.FC = () => {
  const navigate = useNavigate();
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!supabase) {
          setError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
          setLoading(false);
          return;
        }

        // Try to get auth users (this will fail without service role, but let's try)
        try {
          const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
          if (!authError && authData) {
            setAuthUsers(authData.users || []);
          }
        } catch (e) {
          console.log('Cannot access auth.users without service role key');
          setAuthUsers([]);
        }

        // Get profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (profileError) {
          console.error('Profiles error:', profileError);
        } else {
          setProfiles(profileData || []);
        }

        // Get organizations
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (orgError) {
          console.error('Organizations error:', orgError);
        } else {
          setOrganizations(orgData || []);
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p>Loading debug data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Landing
          </Button>
          <h1 className="text-lg font-semibold">System Debug</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <Card className="p-4 bg-red-900/20 border-red-500/50">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>Error: {error}</span>
            </div>
          </Card>
        )}

        {/* Auth Users */}
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Auth Users (auth.users)</h2>
            <span className="text-sm text-slate-400">({authUsers.length} total)</span>
          </div>

          {authUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No auth users found or cannot access without service role key</p>
              <p className="text-sm mt-2">Users are created when signup succeeds</p>
            </div>
          ) : (
            <div className="space-y-3">
              {authUsers.map((user) => (
                <div key={user.id} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm text-blue-400">{user.id}</p>
                      <p className="text-white">{user.email}</p>
                      <p className="text-sm text-slate-400">
                        Created: {new Date(user.created_at).toLocaleString()}
                      </p>
                      {user.user_metadata?.user_type && (
                        <p className="text-sm text-purple-400">
                          Type: {user.user_metadata.user_type}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.email_confirmed_at ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                      }`}>
                        {user.email_confirmed_at ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Profiles */}
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-bold">User Profiles</h2>
            <span className="text-sm text-slate-400">({profiles.length} total)</span>
          </div>

          {profiles.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No profiles found</p>
              <p className="text-sm mt-2">Profiles are created automatically when users sign up</p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div key={profile.id} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm text-green-400">{profile.id}</p>
                      <p className="text-white">{profile.full_name || 'No name'}</p>
                      <p className="text-slate-400">{profile.email || 'No email'}</p>
                      <p className="text-sm text-slate-400">
                        Created: {new Date(profile.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        profile.org_id ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        {profile.org_id ? `Org: ${profile.org_id.slice(0, 8)}...` : 'Individual'}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{profile.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Organizations */}
        <Card className="p-6 bg-slate-800/50 border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold">Organizations</h2>
            <span className="text-sm text-slate-400">({organizations.length} total)</span>
          </div>

          {organizations.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No organizations found</p>
              <p className="text-sm mt-2">Organizations are created during org signup</p>
            </div>
          ) : (
            <div className="space-y-3">
              {organizations.map((org) => (
                <div key={org.id} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-sm text-purple-400">{org.id}</p>
                      <p className="text-white font-semibold">{org.name}</p>
                      <p className="text-slate-400">Slug: {org.slug}</p>
                      <p className="text-sm text-slate-400">
                        Created: {new Date(org.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        org.plan_type === 'free' ? 'bg-gray-600/20 text-gray-400' :
                        org.plan_type === 'pro' ? 'bg-blue-600/20 text-blue-400' :
                        'bg-purple-600/20 text-purple-400'
                      }`}>
                        {org.plan_type}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{org.subscription_status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-blue-900/20 border-blue-500/50">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Debug Instructions</h2>
          </div>

          <div className="space-y-4 text-slate-300">
            <div>
              <h3 className="font-semibold text-white mb-2">If no users are showing:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Signup process is failing - check browser console for errors</li>
                <li>Supabase configuration might be incorrect</li>
                <li>Email verification might be required</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">If users exist but no profiles:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Database trigger is not working</li>
                <li>RLS policies are blocking profile creation</li>
                <li>Run migration 004_fix_auth_and_rls.sql</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">To promote a user to super admin:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Copy a user ID from the Auth Users section above</li>
                <li>Use the promote-superadmin Edge Function</li>
                <li>Or run the SQL in create_superadmin.sql</li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};