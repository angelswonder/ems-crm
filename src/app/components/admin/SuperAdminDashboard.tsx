import React, { useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  Globe,
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  Calendar,
  AlertCircle,
  Zap,
  Toggle2,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

interface OrgStats {
  id: string;
  name: string;
  plan_type: string;
  subscription_status: string;
  created_at: string;
  team_count: number;
  billing_email: string;
}

interface SystemStats {
  totalOrganizations: number;
  activeSubscriptions: number;
  trialing: number;
  inactive: number;
  estimatedMonthlyRevenue: number;
  planDistribution: {
    free: number;
    pro: number;
    enterprise: number;
  };
}

export const SuperAdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [organizations, setOrganizations] = useState<OrgStats[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalOrganizations: 0,
    activeSubscriptions: 0,
    trialing: 0,
    inactive: 0,
    estimatedMonthlyRevenue: 0,
    planDistribution: { free: 0, pro: 0, enterprise: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const toggleOrgPlan = async (org: OrgStats) => {
    const action = org.plan_type === 'pro' ? 'deactivate_pro' : 'activate_pro';
    setActionLoading(org.id);

    try {
      const { error } = await supabase.functions.invoke('stripe-admin-toggle', {
        body: { org_id: org.id, action },
      });

      if (error) throw error;

      toast.success(
        action === 'activate_pro'
          ? `${org.name} has been upgraded to Pro.`
          : `${org.name} has been downgraded to Free.`
      );
      await fetchSystemData();
    } catch (err) {
      console.error('Admin toggle error:', err);
      toast.error('Unable to update organization status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Only super-admin can access this
  const isSuperAdmin = profile?.role === 'owner' && profile?.is_super_admin === true;

  useEffect(() => {
    if (!isSuperAdmin) {
      console.warn('Access denied: Not a super admin');
      return;
    }

    fetchSystemData();
  }, [isSuperAdmin]);

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      // Fetch all organizations (requires special permission)
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          plan_type,
          subscription_status,
          created_at,
          billing_email,
          profiles(count)
        `)
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Calculate statistics
      const orgs = (orgsData || []) as any[];
      const stats: SystemStats = {
        totalOrganizations: orgs.length,
        activeSubscriptions: orgs.filter(o => o.subscription_status === 'active').length,
        trialing: orgs.filter(o => o.subscription_status === 'trialing').length,
        inactive: orgs.filter(o => o.subscription_status === 'inactive').length,
        estimatedMonthlyRevenue: orgs.filter(o => o.subscription_status === 'active').length * 25, // Assume $25/month
        planDistribution: {
          free: orgs.filter(o => o.plan_type === 'free').length,
          pro: orgs.filter(o => o.plan_type === 'pro').length,
          enterprise: orgs.filter(o => o.plan_type === 'enterprise').length,
        },
      };

      setStats(stats);
      setOrganizations(
        orgs.map(o => ({
          id: o.id,
          name: o.name,
          plan_type: o.plan_type,
          subscription_status: o.subscription_status,
          created_at: o.created_at,
          team_count: o.profiles?.[0]?.count || 0,
          billing_email: o.billing_email,
        }))
      );
    } catch (error) {
      console.error('Error fetching system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    if (filterStatus === 'all') return true;
    return org.subscription_status === filterStatus;
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-8 bg-slate-950 min-h-screen text-white">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-400 mb-2">Access Denied</h3>
            <p className="text-red-300 text-sm">
              This dashboard is only available to super administrators. Contact your system administrator if you believe you should have access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 bg-slate-950 min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading system data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tight">
          System Overview{' '}
          <span className="text-indigo-400 text-sm font-mono uppercase ml-4 bg-indigo-400/10 px-3 py-1 rounded-full">
            God Mode
          </span>
        </h1>
        <p className="text-slate-400 mt-2">Real-time monitoring of all organizations and subscriptions</p>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl hover:border-indigo-500/20 transition-all">
          <Globe className="text-indigo-400 mb-4 w-6 h-6" />
          <div className="text-3xl font-black">{stats.totalOrganizations}</div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            Total Companies
          </div>
          <div className="text-slate-500 text-xs mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            +5 this month
          </div>
        </div>

        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl hover:border-emerald-500/20 transition-all">
          <Activity className="text-emerald-400 mb-4 w-6 h-6" />
          <div className="text-3xl font-black">{stats.activeSubscriptions}</div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            Paid Subscriptions
          </div>
          <div className="text-emerald-400 text-xs mt-2">
            {stats.trialing} on trial
          </div>
        </div>

        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl hover:border-pink-500/20 transition-all">
          <CreditCard className="text-pink-400 mb-4 w-6 h-6" />
          <div className="text-3xl font-black">${stats.estimatedMonthlyRevenue}</div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            Est. MRR (Monthly)
          </div>
          <div className="text-pink-400 text-xs mt-2">
            From Pro plans
          </div>
        </div>

        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl hover:border-violet-500/20 transition-all">
          <Users className="text-violet-400 mb-4 w-6 h-6" />
          <div className="text-3xl font-black">
            {organizations.reduce((sum, o) => sum + o.team_count, 0)}
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            Total Users
          </div>
          <div className="text-violet-400 text-xs mt-2">
            Across all orgs
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
          <div className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-3">
            Free Plan
          </div>
          <div className="text-4xl font-black text-slate-300">{stats.planDistribution.free}</div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
            <div
              className="bg-slate-500 h-2 rounded-full"
              style={{
                width: `${(stats.planDistribution.free / stats.totalOrganizations) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
          <div className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-3">
            Pro Plan
          </div>
          <div className="text-4xl font-black text-indigo-400">{stats.planDistribution.pro}</div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
            <div
              className="bg-indigo-500 h-2 rounded-full"
              style={{
                width: `${(stats.planDistribution.pro / stats.totalOrganizations) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
          <div className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-3">
            Enterprise
          </div>
          <div className="text-4xl font-black text-amber-400">{stats.planDistribution.enterprise}</div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-4">
            <div
              className="bg-amber-500 h-2 rounded-full"
              style={{
                width: `${(stats.planDistribution.enterprise / stats.totalOrganizations) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
        {/* Filter */}
        <div className="px-6 py-4 border-b border-white/5 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            All ({organizations.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Active ({stats.activeSubscriptions})
          </button>
          <button
            onClick={() => setFilterStatus('trialing')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === 'trialing'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Trial ({stats.trialing})
          </button>
          <button
            onClick={() => setFilterStatus('inactive')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === 'inactive'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Inactive ({stats.inactive})
          </button>
        </div>

        {/* Table */}
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-[11px] uppercase font-black tracking-widest">
            <tr>
              <th className="px-6 py-4">Company Name</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Team</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredOrganizations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No organizations found
                </td>
              </tr>
            ) : (
              filteredOrganizations.map(org => (
                <tr key={org.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold">{org.name}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-block ${
                        org.subscription_status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : org.subscription_status === 'trialing'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {org.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`capitalize font-medium ${
                        org.plan_type === 'pro'
                          ? 'text-indigo-400'
                          : org.plan_type === 'enterprise'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {org.plan_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{org.team_count} members</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{org.billing_email}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {new Date(org.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    {org.plan_type === 'enterprise' ? (
                      <button
                        disabled
                        className="px-3 py-2 rounded-lg bg-slate-700 text-slate-400 text-xs font-semibold uppercase tracking-widest"
                      >
                        Enterprise
                      </button>
                    ) : (
                      <button
                        disabled={actionLoading === org.id}
                        onClick={() => toggleOrgPlan(org)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all ${
                          org.plan_type === 'pro'
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        } ${actionLoading === org.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {actionLoading === org.id
                          ? 'Updating...'
                          : org.plan_type === 'pro'
                            ? 'Deactivate Pro'
                            : 'Activate Pro'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-slate-500 text-xs">
        <Calendar className="w-4 h-4 inline mr-2" />
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};
