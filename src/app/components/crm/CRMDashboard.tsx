import { useState, useEffect } from 'react';
import { Users, Building2, Target, AlertCircle, TrendingUp, CheckSquare, Megaphone, DollarSign, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { listRecords } from './crmApi';
import type { Lead, Account, Opportunity, Case, Task, Campaign } from './crmTypes';

const STAGE_PROBS: Record<string, number> = {
  'Prospecting': 10, 'Qualification': 20, 'Needs Analysis': 25, 'Value Proposition': 50,
  'Decision Makers': 60, 'Perception Analysis': 70, 'Proposal/Price Quote': 75,
  'Negotiation/Review': 90, 'Closed Won': 100, 'Closed Lost': 0,
};

const PIE_COLORS = ['#2c5f4e', '#3a7d63', '#4a9b7a', '#6abf94', '#8dd5b0', '#b0e8cc'];

interface Stats {
  leads: Lead[];
  accounts: Account[];
  opportunities: Opportunity[];
  cases: Case[];
  tasks: Task[];
  campaigns: Campaign[];
}

function MetricCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export function CRMDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardMode, setDashboardMode] = useState<'overview' | 'pipeline' | 'activity'>('overview');
  const [widgetVisibility, setWidgetVisibility] = useState({
    leads: true,
    accounts: true,
    pipeline: true,
    cases: true,
    tasks: true,
    campaigns: true,
    activity: true,
  });

  const toggleWidget = (key: keyof typeof widgetVisibility) => {
    setWidgetVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [leads, accounts, opportunities, cases, tasks, campaigns] = await Promise.all([
          listRecords<Lead>('lead'),
          listRecords<Account>('account'),
          listRecords<Opportunity>('opportunity'),
          listRecords<Case>('case'),
          listRecords<Task>('task'),
          listRecords<Campaign>('campaign'),
        ]);
        setStats({ leads, accounts, opportunities, cases, tasks, campaigns });
      } catch (e) { console.error('Failed to load CRM stats', e); }
      finally { setLoading(false); }
    };
    loadAll();
  }, []);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading CRM Dashboard...</div>;
  if (!stats) return null;

  const { leads, accounts, opportunities, cases, tasks, campaigns } = stats;

  const openOpps = opportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost');
  const pipelineValue = openOpps.reduce((s, o) => s + (o.amount ?? 0), 0);
  const wonValue = opportunities.filter(o => o.stage === 'Closed Won').reduce((s, o) => s + (o.amount ?? 0), 0);
  const openCases = cases.filter(c => c.status !== 'Closed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Deferred').length;

  // Lead status chart
  const leadStatusData = (['New', 'Working', 'Nurturing', 'Qualified', 'Converted'] as const).map(s => ({
    name: s,
    value: leads.filter(l => l.status === s).length,
  })).filter(d => d.value > 0);

  // Opportunity pipeline chart
  const pipelineData = [
    'Prospecting', 'Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won'
  ].map(stage => ({
    stage: stage.length > 12 ? stage.slice(0, 12) + '…' : stage,
    fullStage: stage,
    value: opportunities.filter(o => o.stage === stage).reduce((s, o) => s + (o.amount ?? 0), 0) / 1000,
    count: opportunities.filter(o => o.stage === stage).length,
  }));

  // Case priority chart
  const casePriorityData = (['Critical', 'High', 'Medium', 'Low'] as const).map(p => ({
    name: p,
    value: cases.filter(c => c.priority === p && c.status !== 'Closed').length,
  })).filter(d => d.value > 0);

  // Recent activities
  const recentActivity = [
    ...leads.slice(0, 3).map(l => ({ type: 'Lead', title: `${l.firstName} ${l.lastName}`, sub: l.company, date: l.createdAt, color: 'bg-blue-500' })),
    ...opportunities.slice(0, 2).map(o => ({ type: 'Opportunity', title: o.name, sub: `£${(o.amount ?? 0).toLocaleString()}`, date: o.createdAt, color: 'bg-green-500' })),
    ...cases.slice(0, 2).map(c => ({ type: 'Case', title: c.subject, sub: `#${c.caseNumber}`, date: c.createdAt, color: 'bg-red-500' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="bg-card rounded-2xl border border-border/30 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-2">Dashboard Modes</p>
              <h2 className="text-lg font-semibold text-foreground">CRM {dashboardMode.charAt(0).toUpperCase() + dashboardMode.slice(1)} Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-1">Customize which widgets appear in your {dashboardMode} view to optimize your workflow.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['overview', 'pipeline', 'activity'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDashboardMode(mode)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${dashboardMode === mode ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-slate-200'}`}
                >
                  {mode === 'overview' ? 'Overview' : mode === 'pipeline' ? 'Pipeline' : 'Activity'}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(widgetVisibility).map(([key, visible]) => (
              <button
                key={key}
                onClick={() => toggleWidget(key as keyof typeof widgetVisibility)}
                className={`rounded-2xl border px-3 py-2 text-sm transition ${visible ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background text-muted-foreground hover:bg-muted/70'}`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/30 p-5 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-3">Dashboard Controls</p>
          <p className="text-sm text-muted-foreground leading-6">Switch between Overview (all metrics), Pipeline (sales focused), or Activity (recent items) modes. Toggle widgets on/off to customize. Create templates and assign dashboards to team members.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {widgetVisibility.leads && (
          <MetricCard icon={Users} label="Total Leads" value={leads.length}
            sub={`${leads.filter(l => l.status === 'New').length} new this period`} color="bg-blue-500" />
        )}
        {widgetVisibility.accounts && (
          <MetricCard icon={Building2} label="Accounts" value={accounts.length}
            sub={`${accounts.filter(a => a.type === 'Customer').length} customers`} color="bg-purple-500" />
        )}
        {widgetVisibility.pipeline && (
          <MetricCard icon={Target} label="Pipeline Value" value={`£${(pipelineValue / 1000).toFixed(0)}K`}
            sub={`£${(wonValue / 1000).toFixed(0)}K won this period`} color="bg-emerald-500" />
        )}
        {widgetVisibility.cases && (
          <MetricCard icon={AlertCircle} label="Open Cases" value={openCases}
            sub={`${cases.filter(c => c.priority === 'Critical' && c.status !== 'Closed').length} critical`} color="bg-red-500" />
        )}
        {widgetVisibility.tasks && (
          <MetricCard icon={CheckSquare} label="Open Tasks" value={pendingTasks}
            sub={`${tasks.filter(t => t.status === 'Completed').length} completed`} color="bg-amber-500" />
        )}
        {widgetVisibility.campaigns && (
          <MetricCard icon={Megaphone} label="Active Campaigns" value={campaigns.filter(c => c.status === 'In Progress').length}
            sub={`${campaigns.length} total campaigns`} color="bg-pink-500" />
        )}
        {widgetVisibility.pipeline && (
          <MetricCard icon={DollarSign} label="Won Revenue" value={`£${(wonValue / 1000).toFixed(0)}K`}
            sub={`${opportunities.filter(o => o.stage === 'Closed Won').length} closed won`} color="bg-teal-500" />
        )}
        {widgetVisibility.activity && (
          <MetricCard icon={Activity} label="Total Activities" value={tasks.length + leads.length}
            sub="Leads + Tasks tracked" color="bg-indigo-500" />
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4">Opportunity Pipeline (£K)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineData} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                formatter={(val: number, _: string, props: any) => [`£${(val as number).toFixed(0)}K · ${props.payload.count} deals`, 'Value']}
              />
              <Bar dataKey="value" fill="#2c5f4e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leads by Status Pie */}
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4">Leads by Status</h3>
          {leadStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={leadStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {leadStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={10} formatter={v => <span style={{ fontSize: 12 }}>{v}</span>} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No lead data</div>}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Priority */}
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4">Open Cases by Priority</h3>
          {casePriorityData.length > 0 ? (
            <div className="space-y-3">
              {casePriorityData.map((d, i) => {
                const colors: Record<string, string> = { Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#22c55e' };
                const total = casePriorityData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={d.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground font-medium">{d.name}</span>
                      <span className="text-muted-foreground">{d.value} cases</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(d.value / total) * 100}%`, backgroundColor: colors[d.name] ?? '#94a3b8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="h-[150px] flex items-center justify-center text-muted-foreground text-sm">No open cases</div>}
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.type} · {a.sub}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(a.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>}
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Top Opportunities</h3>
          <div className="space-y-2">
            {opportunities.filter(o => o.stage !== 'Closed Lost').sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)).slice(0, 4).map(o => (
              <div key={o.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{o.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{o.stage}</p>
                </div>
                <span className="text-xs font-semibold text-primary ml-2">£{((o.amount ?? 0) / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Account Distribution</h3>
          <div className="space-y-2">
            {['Customer', 'Prospect', 'Partner', 'Reseller'].map(type => {
              const count = accounts.filter(a => a.type === type).length;
              return count > 0 ? (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(count / accounts.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-4">{count}</span>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm p-5">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Task Status Summary</h3>
          <div className="space-y-2">
            {['Not Started', 'In Progress', 'Completed', 'Waiting on Someone Else', 'Deferred'].map(status => {
              const count = tasks.filter(t => t.status === status).length;
              return count > 0 ? (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[130px]">{status}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: tasks.length ? `${(count / tasks.length) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-xs font-medium text-foreground w-4">{count}</span>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
