import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { LayoutDashboard, Users, Building2, UserCircle, Target, AlertCircle, CheckSquare, CalendarDays, Megaphone, Plus, ShieldAlert, Folder, Layout, Mail } from 'lucide-react';
import { CRMDashboard } from './CRMDashboard';
import { loadCustomObjectConfig } from '../../utils/crmStorageUtils';
import { LeadsModule } from './LeadsModule';
import { AccountsModule } from './AccountsModule';
import { ContactsModule } from './ContactsModule';
import { OpportunitiesModule } from './OpportunitiesModule';
import { CasesModule } from './CasesModule';
import { TasksModule } from './TasksModule';
import { CalendarModule } from './CalendarModule';
import { CampaignsModule } from './CampaignsModule';
import { EmailModule } from './EmailModule';
import { CustomObjectBuilder } from './CustomObjectBuilder';
import { FolderManagement } from './FolderManagement';
import { DashboardTemplateManager } from './DashboardTemplateManager';

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
  { id: 'emails',        label: 'Emails',          icon: Mail },
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
  const [showObjectBuilder, setShowObjectBuilder] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [showFolderManagement, setShowFolderManagement] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const addCustomTab = () => {
    const name = newObjectName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    setCrmTabs((prev) => [...prev, { id, label: name, icon: Target, visible: true, custom: true }]);
    setActiveTab(id);
    setSelectedObjectId(id);
    setShowObjectBuilder(true);
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
      case 'emails':        return <EmailModule />;
      default:
        if (activeTab.startsWith('custom-')) {
          const customTab = crmTabs.find((tab) => tab.id === activeTab);
          const customObjectConfig = loadCustomObjectConfig(activeTab);
          return (
            <div className="rounded-3xl bg-card border border-border/30 p-10 text-center">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">{customTab?.label}</h2>
              <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
                Click "Configure Object" to define fields, data types, and display preferences for this custom CRM object.
              </p>
              {customObjectConfig ? (
                <div className="mt-6 rounded-3xl border border-border/30 bg-muted/50 p-5 text-left">
                  <p className="text-sm font-semibold text-foreground mb-2">Object Summary</p>
                  <p className="text-sm text-muted-foreground">Display Type: <span className="font-medium text-foreground">{customObjectConfig.displayType}</span></p>
                  <p className="text-sm text-muted-foreground">Fields: <span className="font-medium text-foreground">{customObjectConfig.fields.length}</span></p>
                  <p className="text-sm text-muted-foreground">Last Modified: <span className="font-medium text-foreground">{new Date(customObjectConfig.lastModified).toLocaleString()}</span></p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-border/20 text-left text-muted-foreground">
                          <th className="py-2">Label</th>
                          <th className="py-2">Name</th>
                          <th className="py-2">Type</th>
                          <th className="py-2">Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customObjectConfig.fields.map((field) => (
                          <tr key={field.id} className="border-b border-border/10">
                            <td className="py-2 text-foreground">{field.label}</td>
                            <td className="py-2 text-muted-foreground font-mono text-xs">{field.name}</td>
                            <td className="py-2 text-muted-foreground">{field.type}</td>
                            <td className="py-2 text-muted-foreground">{field.required ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    setSelectedObjectId(activeTab);
                    setShowObjectBuilder(true);
                  }}
                  className="mt-6 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition"
                >
                  Configure Object
                </button>
              )}
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFolderManagement(true)}
              className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
              title="Manage Folders"
            >
              <Folder className="w-4 h-4" />
              <span className="hidden sm:inline">Folders</span>
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setShowTemplateManager(true)}
                className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
                title="Manage Dashboard Templates"
              >
                <Layout className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
              </button>
            )}
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
                <h2 className="text-lg font-semibold text-foreground">Create Custom CRM Objects</h2>
                <p className="text-sm text-muted-foreground mt-1">Add new CRM objects with editable fields, tables, and dashboards. Assign to team members.</p>
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

      {/* Custom Object Builder Modal */}
      {showObjectBuilder && selectedObjectId && (
        <CustomObjectBuilder
          objectId={selectedObjectId}
          objectName={crmTabs.find((tab) => tab.id === selectedObjectId)?.label || 'Custom Object'}
          onClose={() => setShowObjectBuilder(false)}
        />
      )}

      {/* Folder Management Modal */}
      {showFolderManagement && (
        <FolderManagement
          onClose={() => setShowFolderManagement(false)}
        />
      )}

      {/* Dashboard Template Manager Modal */}
      {showTemplateManager && (
        <DashboardTemplateManager
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </div>
  );
}
