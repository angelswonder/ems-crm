import React, { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Mail, Send, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'declined';
  created_at: string;
  token: string;
}

export const InviteMember: React.FC = () => {
  const { tenant, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Can only admin/owner invite
  const canInvite = profile && ['owner', 'admin'].includes(profile.role);

  const fetchInvitations = useCallback(async () => {
    if (!tenant) return;

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('org_id', tenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [tenant]);

  // Load invitations on mount
  React.useEffect(() => {
    if (showInvitations && tenant) {
      fetchInvitations();
    }
  }, [showInvitations, tenant, fetchInvitations]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenant || !canInvite) {
      toast.error('You do not have permission to invite members');
      return;
    }

    setLoading(true);

    try {
      // Create invitation in database
      const { data, error } = await supabase
        .from('invitations')
        .insert([{
          email: email.toLowerCase().trim(),
          org_id: tenant.id,
          role,
          invited_by: profile?.id,
          status: 'pending',
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This email is already invited to your organization');
        } else {
          throw error;
        }
        return;
      }

      // Here you would trigger an Edge Function to send the invitation email
      // For now, show the link for manual sharing
      const inviteLink = `${window.location.origin}/accept-invite?token=${data.token}`;

      toast.success(
        `Invitation created! Share this link:\n\n${inviteLink}`,
        {
          duration: 8000,
        }
      );

      setEmail('');
      setRole('member');
      await fetchInvitations();
    } catch (error) {
      console.error('Invitation error:', error);
      toast.error('Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, token: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('Invitation canceled');
      await fetchInvitations();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  if (!canInvite) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <div className="bg-slate-900/50 border border-white/10 p-8 rounded-3xl">
        <h3 className="text-xl font-bold text-white mb-2">Invite Team Members</h3>
        <p className="text-slate-400 text-sm mb-6">
          Add colleagues to your organization. They'll receive an invitation link.
        </p>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Input */}
            <div className="md:col-span-2 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Role Select */}
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'member' | 'viewer')}
              className="bg-slate-950 border border-white/5 rounded-2xl py-4 px-4 text-white focus:border-indigo-500 outline-none transition-all"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>

            {/* Send Button */}
            <button
              disabled={loading || !email}
              type="submit"
              className="md:col-span-1 bg-indigo-600 hover:bg-indigo-500 text-white px-8 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              Invite
            </button>
          </div>

          {/* Role Descriptions */}
          <div className="text-xs text-slate-500 space-y-1">
            <p>• <span className="text-white font-medium">Member:</span> Can view and edit CRM data</p>
            <p>• <span className="text-white font-medium">Admin:</span> Can manage members and settings</p>
            <p>• <span className="text-white font-medium">Viewer:</span> Read-only access</p>
          </div>
        </form>
      </div>

      {/* Active Invitations */}
      <div className="bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden">
        <button
          onClick={() => setShowInvitations(!showInvitations)}
          className="w-full px-8 py-6 text-left hover:bg-slate-900/75 transition-colors flex justify-between items-center"
        >
          <h3 className="text-xl font-bold text-white">
            Pending Invitations
          </h3>
          <span className="text-slate-400 text-sm">
            {showInvitations ? '▼' : '▶'}
          </span>
        </button>

        {showInvitations && (
          <div className="border-t border-white/5 p-8">
            {invitations.length === 0 ? (
              <p className="text-slate-400 text-center py-6">No pending invitations</p>
            ) : (
              <div className="space-y-4">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-slate-950 border border-white/5 rounded-2xl p-4 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">{invite.email}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Role: <span className="capitalize">{invite.role}</span> •{' '}
                        <span
                          className={
                            invite.status === 'pending'
                              ? 'text-amber-400'
                              : invite.status === 'accepted'
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                          }
                        >
                          {invite.status === 'pending'
                            ? 'Awaiting response'
                            : invite.status === 'accepted'
                              ? 'Accepted'
                              : 'Canceled'}
                        </span>
                      </p>
                    </div>

                    {invite.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
                            copyToClipboard(link, invite.token);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Copy invitation link"
                        >
                          {copiedToken === invite.token ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => cancelInvitation(invite.id)}
                          className="px-4 py-2 bg-slate-800 hover:bg-red-900/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
