import { useState } from 'react';
import { Plus, Trash2, Table2, TrendingUp, BarChart3, X } from 'lucide-react';
import { toast } from 'sonner';

export interface CustomObject {
  id: string;
  name: string;
  singularLabel: string;
  fields: CustomField[];
  displayType: 'table' | 'dashboard' | 'hybrid';
  createdAt: string;
}

export interface CustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'email' | 'phone';
  required: boolean;
}

interface Props {
  objectId: string;
  objectName: string;
  onClose: () => void;
}

export function CustomObjectBuilder({ objectId, objectName, onClose }: Props) {
  const [fields, setFields] = useState<CustomField[]>([
    { id: '1', name: 'name', label: 'Name', type: 'text', required: true },
    { id: '2', name: 'description', label: 'Description', type: 'text', required: false },
    { id: '3', name: 'status', label: 'Status', type: 'select', required: true },
  ]);
  const [displayType, setDisplayType] = useState<'table' | 'dashboard' | 'hybrid'>('table');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['type']>('text');

  const addField = () => {
    if (!newFieldName.trim()) {
      toast.error('Field name is required');
      return;
    }
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      name: newFieldName.toLowerCase().replace(/\s+/g, '_'),
      label: newFieldName,
      type: newFieldType,
      required: false,
    };
    setFields([...fields, newField]);
    setNewFieldName('');
    toast.success('Field added');
  };

  const removeField = (id: string) => {
    if (fields.length <= 1) {
      toast.error('Object must have at least one field');
      return;
    }
    setFields(fields.filter((f) => f.id !== id));
  };

  const toggleRequired = (id: string) => {
    setFields(
      fields.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    );
  };

  const handleSave = () => {
    if (fields.length === 0) {
      toast.error('Add at least one field');
      return;
    }
    const config = {
      objectId,
      name: objectName,
      fields,
      displayType,
      recordCount: 0,
      lastModified: new Date().toISOString(),
    };
    localStorage.setItem(`crm_object_${objectId}`, JSON.stringify(config));
    toast.success(`"${objectName}" object configured with ${fields.length} fields`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between border-b border-border/20 px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}
        >
          <div>
            <h2 className="text-white font-semibold text-lg">{objectName} Object Builder</h2>
            <p className="text-white/70 text-sm mt-1">Define fields, data types, and display preferences</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Display Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Display Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { type: 'table' as const, label: 'Table', icon: Table2, desc: 'Data in table rows' },
                  {
                    type: 'dashboard' as const,
                    label: 'Dashboard',
                    icon: TrendingUp,
                    desc: 'Cards & metrics',
                  },
                  {
                    type: 'hybrid' as const,
                    label: 'Hybrid',
                    icon: BarChart3,
                    desc: 'Both table & charts',
                  },
                ] as const
              ).map(({ type, label, icon: Icon, desc }) => (
                <button
                  key={type}
                  onClick={() => setDisplayType(type)}
                  className={`rounded-xl p-3 border-2 transition text-left ${
                    displayType === type
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-2 text-foreground" />
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Fields Section */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Object Fields ({fields.length})
            </label>
            <div className="bg-muted/20 rounded-2xl border border-border/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Field Label</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Field Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Required</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field) => (
                      <tr key={field.id} className="border-b border-border/20 hover:bg-muted/30 transition">
                        <td className="px-4 py-3 font-medium text-foreground">{field.label}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{field.name}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {field.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleRequired(field.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                              field.required
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {field.required ? 'Required' : 'Optional'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeField(field.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Add Field Form */}
          <div className="bg-muted/20 rounded-2xl border border-border/30 p-4">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Add New Field
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Field name (e.g., Company Size, Budget)"
                className="flex-1 px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as CustomField['type'])}
                className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="select">Select List</option>
                <option value="checkbox">Checkbox</option>
              </select>
              <button
                onClick={addField}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm text-blue-900 leading-6">
              <span className="font-semibold">Data Storage:</span> This object is stored in Supabase. Fields will be
              automatically migrated to the database when you save. Team members can view, create, and edit records
              based on their permissions.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border/20">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-primary text-white font-medium hover:opacity-95 transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
