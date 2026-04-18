import { useState } from 'react';
import { Plus, Edit2, Trash2, Copy, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  type: 'overview' | 'pipeline' | 'activity' | 'custom';
  widgets: {
    leads: boolean;
    accounts: boolean;
    pipeline: boolean;
    cases: boolean;
    tasks: boolean;
    campaigns: boolean;
    messaging: boolean;
  };
  mode: 'overview' | 'pipeline' | 'activity';
  createdBy: string;
  createdAt: string;
  assignedTo?: string[]; // User IDs
  assignedRoles?: string[]; // Role names
  isDefault: boolean;
  isPinned: boolean;
}

interface Props {
  onClose: () => void;
}

export function DashboardTemplateManager({ onClose }: Props) {
  const { currentUser } = useApp();
  const [templates, setTemplates] = useState<DashboardTemplate[]>([
    {
      id: '1',
      name: 'Sales Overview',
      description: 'Complete overview for sales teams',
      type: 'overview',
      mode: 'overview',
      widgets: {
        leads: true,
        accounts: true,
        pipeline: true,
        cases: false,
        tasks: true,
        campaigns: true,
        messaging: false,
      },
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      assignedRoles: ['team-leader', 'supervisor'],
      isDefault: false,
      isPinned: false,
    },
    {
      id: '2',
      name: 'Pipeline Focus',
      description: 'Optimized for pipeline management',
      type: 'pipeline',
      mode: 'pipeline',
      widgets: {
        leads: true,
        accounts: true,
        pipeline: true,
        cases: false,
        tasks: false,
        campaigns: false,
        messaging: false,
      },
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      assignedRoles: ['manager'],
      isDefault: true,
      isPinned: true,
    },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);

  const createTemplate = (template: DashboardTemplate) => {
    setTemplates([...templates, { ...template, id: `template-${Date.now()}` }]);
    toast.success(`Template "${template.name}" created`);
    setShowNewTemplate(false);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    toast.success('Template deleted');
  };

  const duplicateTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (template) {
      const newTemplate = {
        ...template,
        id: `template-${Date.now()}`,
        name: `${template.name} (Copy)`,
        createdAt: new Date().toISOString(),
      };
      setTemplates([...templates, newTemplate]);
      toast.success('Template duplicated');
    }
  };

  const updateTemplate = (id: string, updates: Partial<DashboardTemplate>) => {
    setTemplates(templates.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    setEditingId(null);
    toast.success('Template updated');
  };

  const toggleWidget = (templateId: string, widget: keyof DashboardTemplate['widgets']) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      updateTemplate(templateId, {
        widgets: {
          ...template.widgets,
          [widget]: !template.widgets[widget],
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-border/20 px-6 py-5" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-lg">Dashboard Templates</h2>
              <p className="text-white/70 text-sm mt-1">Create and assign dashboard templates to users and roles</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Create Button */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setShowNewTemplate(!showNewTemplate)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-95 transition"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          )}

          {/* New Template Form */}
          {showNewTemplate && (
            <TemplateForm
              onSave={(template) => {
                createTemplate(template);
              }}
              onCancel={() => setShowNewTemplate(false)}
            />
          )}

          {/* Templates Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`rounded-2xl border-2 p-4 transition cursor-pointer ${
                  selectedTemplate?.id === template.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border/30 bg-card hover:border-primary/50'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Default</span>
                      )}
                      {template.isPinned && <span className="text-yellow-500">📌</span>}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  </div>
                </div>

                {/* Mode Badge */}
                <div className="mb-3">
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                    {template.mode.charAt(0).toUpperCase() + template.mode.slice(1)} Mode
                  </span>
                </div>

                {/* Widgets Display */}
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Widgets Enabled:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(template.widgets)
                      .filter(([, enabled]) => enabled)
                      .map(([widget]) => (
                        <span
                          key={widget}
                          className="text-xs px-2 py-1 rounded bg-primary/20 text-primary"
                        >
                          {widget.charAt(0).toUpperCase() + widget.slice(1)}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground space-y-1 mb-4">
                  <p>Created by: {template.createdBy}</p>
                  <p>Assigned Roles: {template.assignedRoles?.join(', ') || 'None'}</p>
                </div>

                {/* Actions */}
                {currentUser?.role === 'admin' && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(template.id);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-medium hover:opacity-95 transition flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateTemplate(template.id);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-500 text-white text-xs font-medium hover:opacity-95 transition flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-medium hover:opacity-95 transition flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Template Editor */}
          {editingId && (
            <TemplateEditor
              template={templates.find((t) => t.id === editingId)!}
              onSave={(updates) => {
                updateTemplate(editingId, updates);
              }}
              onCancel={() => setEditingId(null)}
              toggleWidget={(widget) => toggleWidget(editingId, widget)}
            />
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm text-blue-900 leading-6">
              <span className="font-semibold">📊 Templates:</span> Create custom dashboard templates with specific widgets enabled for different roles or users. Templates can be set as default and pinned for quick access. Assign templates to roles to automatically set them for team members.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TemplateFormProps {
  onSave: (template: DashboardTemplate) => void;
  onCancel: () => void;
}

function TemplateForm({ onSave, onCancel }: TemplateFormProps) {
  const { currentUser } = useApp();
  const [form, setForm] = useState<Partial<DashboardTemplate>>({
    name: '',
    description: '',
    type: 'custom',
    mode: 'overview',
    widgets: {
      leads: true,
      accounts: true,
      pipeline: true,
      cases: false,
      tasks: true,
      campaigns: false,
      messaging: false,
    },
  });

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast.error('Template name is required');
      return;
    }
    onSave({
      id: '',
      name: form.name,
      description: form.description || '',
      type: form.type || 'custom',
      mode: form.mode || 'overview',
      widgets: form.widgets!,
      createdBy: currentUser?.username || 'Admin',
      createdAt: new Date().toISOString(),
      isDefault: false,
      isPinned: false,
    });
  };

  return (
    <div className="bg-muted/20 rounded-2xl border border-border/30 p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Create New Template</h3>
      <div className="space-y-4">
        <input
          value={form.name || ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Template name (e.g., Sales Manager Dashboard)"
          className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <textarea
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description..."
          className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 h-20"
        />
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Mode</label>
          <select
            value={form.mode || 'overview'}
            onChange={(e) => setForm({ ...form, mode: e.target.value as any })}
            className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="overview">Overview</option>
            <option value="pipeline">Pipeline</option>
            <option value="activity">Activity</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Widgets</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(form.widgets || {}).map(([widget, enabled]) => (
              <label key={widget} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      widgets: { ...form.widgets, [widget]: e.target.checked },
                    })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-foreground">{widget.charAt(0).toUpperCase() + widget.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-4 border-t border-border/20">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-95 transition"
          >
            Create Template
          </button>
        </div>
      </div>
    </div>
  );
}

interface TemplateEditorProps {
  template: DashboardTemplate;
  onSave: (updates: Partial<DashboardTemplate>) => void;
  onCancel: () => void;
  toggleWidget: (widget: keyof DashboardTemplate['widgets']) => void;
}

function TemplateEditor({ template, onSave, onCancel, toggleWidget }: TemplateEditorProps) {
  const [form, setForm] = useState(template);

  return (
    <div className="bg-muted/20 rounded-2xl border border-border/30 p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Edit Template: {template.name}</h3>
      <div className="space-y-4">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Widgets</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(form.widgets).map(([widget, enabled]) => (
              <label key={widget} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleWidget(widget as keyof DashboardTemplate['widgets'])}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-foreground">{widget.charAt(0).toUpperCase() + widget.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-4 border-t border-border/20">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:opacity-95 transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
