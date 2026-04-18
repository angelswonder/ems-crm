import { useState } from 'react';
import { LayoutDashboard, Users, Building2, UserCircle, Target, AlertCircle, CheckSquare, CalendarDays, Megaphone } from 'lucide-react';
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

export function CRMHub() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

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
      default:              return <CRMDashboard />;
    }
  };

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

      {/* Tab Navigation */}
      <div className="px-6 pt-4">
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map(tab => {
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
