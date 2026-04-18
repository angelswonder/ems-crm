import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { LayoutDashboard, Users, Building2, UserCircle, Target, AlertCircle, CheckSquare, CalendarDays, Megaphone, Plus, ShieldAlert } from 'lucide-react';
import { CRMDashboard } from './CRMDashboard';
import { LeadsModule } from './LeadsModule';
import { AccountsModule } from './AccountsModule';
import { ContactsModule } from './ContactsModule';
import { OpportunitiesModule } from './OpportunitiesModule';
import { CasesModule } from './CasesModule';
import { TasksModule } from './TasksModule';
import { CalendarModule } from './CalendarModule';
import { CampaignsModule } from './CampaignsModule';

const TABS = [
  { id: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'leads',         label: 'Leads',           icon: Users },
  { id: 'accounts',      label: 'Accounts',        icon: Building2 },
  { id: 'contacts',      label: 'Contacts',        icon: UserCircle },
  { id: 'opportunities', label: 'Opportunities',   icon: Target },
  { id: 'cases',         label: 'Cases',           icon: AlertCircle },
  { id: 'tasks',         label: 'Tasks',           icon: CheckSquare },
  { id: 'calendar',      label: 'Calendar',        icon: CalendarDays },
  { id: 'campaigns',     label: 'Campaigns',       icon: Megaphone },
] as const;

type TabId = typeof TABS[number]['id'];

type CRMTab = {
  id: string;
  label: string;
  icon: any;
  visible: boolean;
  custom?: boolean;
};

const INITIAL_CRM_TABS: CRMTab[] = [
  ...TABS.map((tab) => ({ ...tab, visible: true })),
];

export function CRMHub() {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [crmTabs, setCrmTabs] = useState<CRMTab[]>(INITIAL_CRM_TABS);
  const [newObjectName, setNewObjectName] = useState('');

  const addCustomTab = () => {
    const name = newObjectName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    setCrmTabs((prev) => [...prev, { id, label: name, icon: Target, visible: true, custom: true }]);
    setActiveTab(id);
    setNewObjectName('');
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':     return <CRMDashboard />;
      case 'leads':         return <LeadsModule />;
      case 'accounts':      return <AccountsModule />;
      case 'contacts':      return <ContactsModule />;
      case 'opportunities': return <OpportunitiesModule />;
      case 'cases':         return <CasesModule />;
      case 'tasks':         return <TasksModule />;
      case 'calendar':      return <CalendarModule />;
      case 'campaigns':     return <CampaignsModule />;
      default:
        if (activeTab.startsWith('custom-')) {
          const customTab = crmTabs.find((tab) => tab.id === activeTab);
          return (
            <div className="rounded-3xl bg-card border border-border/30 p-10 text-center">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{customTab?.label}</h2>
              <p className="mt-3 text-sm text-muted-foreground">This is a custom CRM object placeholder. Admins can use this panel to define new CRM objects and tabs for future extension.</p>
            </div>
          );
        }
        return <CRMDashboard />;
    }
  };

  const visibleTabs = crmTabs;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8faf9' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">CRM</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Customer Relationship Management · All records stored in Supabase</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium">Live Database</span>
          </div>
        </div>
      </div>

      {/* Admin CRM Builder */}
      {currentUser?.role === 'admin' && (
        <div className="px-6 pt-4">
          <div className="rounded-3xl border border-border/30 bg-card p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-2">CRM Admin</p>
                <h2 className="text-lg font-semibold text-foreground">Manage CRM objects and tabs</h2>
                <p className="text-sm text-muted-foreground mt-1">Add custom CRM objects or update the CRM tab set for your organization.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <input
                  value={newObjectName}
                  onChange={(e) => setNewObjectName(e.target.value)}
                  placeholder="New object name"
                  className="w-full sm:w-[240px] px-3 py-2 rounded-xl border border-border/30 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={addCustomTab} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-primary text-white text-sm font-medium hover:opacity-95 transition-all">
                  <Plus className="w-4 h-4" /> Add Object
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-6 pt-4">
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? 'text-primary border-primary bg-card shadow-sm'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-card/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="h-px bg-border/30" />
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTab()}
      </div>
    </div>
  );
}
