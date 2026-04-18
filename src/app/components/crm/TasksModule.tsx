import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, CheckCircle, Circle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { listRecords, createRecord, updateRecord, deleteRecord } from './crmApi';
import type { Task } from './crmTypes';

const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Waiting on Someone Else', 'Deferred'];
const PRIORITIES = ['Low', 'Normal', 'High'];
const RELATED_TYPES = ['Lead', 'Account', 'Contact', 'Opportunity', 'Case'];

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
  'Waiting on Someone Else': 'bg-amber-100 text-amber-700',
  'Deferred': 'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-sky-100 text-sky-700',
  Normal: 'bg-slate-100 text-slate-700',
  High: 'bg-red-100 text-red-700',
};

const EMPTY: Partial<Task> = {
  subject: '', status: 'Not Started', priority: 'Normal', dueDate: '',
  relatedToType: '', relatedToId: '', relatedToName: '', description: '', owner: 'Wonder Ayobami',
};

const SEED: Partial<Task>[] = [
  { subject: 'Follow up with Tesla Energy on proposal', status: 'Not Started', priority: 'High', dueDate: '2026-04-25', relatedToType: 'Opportunity', relatedToName: 'Tesla Energy System Upgrade', owner: 'Wonder Ayobami' },
  { subject: 'Prepare energy audit report for GreenPower', status: 'In Progress', priority: 'High', dueDate: '2026-04-22', relatedToType: 'Account', relatedToName: 'GreenPower Industries', owner: 'Wonder Ayobami' },
  { subject: 'Schedule site visit to National Grid Manchester', status: 'Not Started', priority: 'Normal', dueDate: '2026-04-30', relatedToType: 'Account', relatedToName: 'National Grid Plc', owner: 'Sarah Mitchell' },
  { subject: 'Review and close billing case for Tesla', status: 'Completed', priority: 'Normal', dueDate: '2026-04-18', relatedToType: 'Case', relatedToName: 'Billing discrepancy', owner: 'Sarah Mitchell' },
  { subject: 'Send partnership contract to SolarTech', status: 'In Progress', priority: 'High', dueDate: '2026-04-20', relatedToType: 'Opportunity', relatedToName: 'SolarTech Partnership Deal', owner: 'Wonder Ayobami' },
  { subject: 'Onboard new lead RenewTech Plc', status: 'Not Started', priority: 'Normal', dueDate: '2026-05-05', relatedToType: 'Lead', relatedToName: 'Sophie Turner', owner: 'Sarah Mitchell' },
];

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>{label}</span>;
}

function FieldInput({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{label}</label>
      <select value={value ?? ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all">
        <option value="">Select...</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function TasksModule() {
  const [records, setRecords] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Task>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listRecords<Task>('task');
      if (data.length === 0) {
        for (const s of SEED) { await createRecord<Task>('task', s); }
        const seeded = await listRecords<Task>('task');
        setRecords(seeded);
      } else {
        setRecords(data.sort((a, b) => {
          if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }));
      }
    } catch (e) { toast.error('Failed to load tasks'); console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    const match = !q || `${r.subject} ${r.relatedToName} ${r.owner}`.toLowerCase().includes(q);
    return match && (!filterStatus || r.status === filterStatus) && (!filterPriority || r.priority === filterPriority);
  }), [records, search, filterStatus, filterPriority]);

  const openNew = () => { setFormData({ ...EMPTY }); setEditMode(false); setShowForm(true); setSelected(null); };
  const openEdit = (r: Task) => { setFormData({ ...r }); setEditMode(true); setShowForm(true); setSelected(null); };
  const openView = (r: Task) => { setSelected(r); setShowForm(false); };
  const upd = (key: keyof Task) => (v: string) => setFormData(d => ({ ...d, [key]: v }));

  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Not Started' : 'Completed';
    try {
      const updated = await updateRecord<Task>('task', task.id, { ...task, status: newStatus });
      setRecords(r => r.map(x => x.id === updated.id ? updated : x));
      toast.success(newStatus === 'Completed' ? 'Task completed!' : 'Task reopened');
    } catch (e) { toast.error('Update failed'); }
  };

  const handleSave = async () => {
    if (!formData.subject?.trim()) { toast.error('Subject is required'); return; }
    setSaving(true);
    try {
      if (editMode && formData.id) {
        const updated = await updateRecord<Task>('task', formData.id, formData);
        setRecords(r => r.map(x => x.id === updated.id ? updated : x));
        toast.success('Task updated');
      } else {
        const created = await createRecord<Task>('task', formData);
        setRecords(r => [created, ...r]);
        toast.success('Task created');
      }
      setShowForm(false);
    } catch (e) { toast.error('Save failed'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord('task', id);
      setRecords(r => r.filter(x => x.id !== id));
      setDeleteId(null); setSelected(null);
      toast.success('Task deleted');
    } catch (e) { toast.error('Delete failed'); console.error(e); }
  };

  const isOverdue = (t: Task) => t.dueDate && t.status !== 'Completed' && new Date(t.dueDate) < new Date();
  const openCount = records.filter(r => r.status !== 'Completed' && r.status !== 'Deferred').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
          <p className="text-sm text-muted-foreground">{records.length} total · {openCount} open</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No tasks found</div>
        ) : (
          <div className="divide-y divide-border/20">
            {filtered.map(r => (
              <div key={r.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors ${isOverdue(r) ? 'bg-red-50/40' : ''}`}>
                <button onClick={() => toggleComplete(r)} className="flex-shrink-0">
                  {r.status === 'Completed'
                    ? <CheckCircle className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openView(r)}>
                  <p className={`text-sm font-medium ${r.status === 'Completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{r.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.relatedToType && `${r.relatedToType}: `}{r.relatedToName}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge label={r.priority} colorClass={PRIORITY_COLORS[r.priority] ?? 'bg-gray-100 text-gray-700'} />
                  <Badge label={r.status} colorClass={STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-700'} />
                  {r.dueDate && (
                    <div className={`flex items-center gap-1 text-xs ${isOverdue(r) ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      <Clock className="w-3 h-3" />
                      {new Date(r.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-[520px] max-h-[85vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20 rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">Task Details</h3>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null); }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteId(selected.id)} className="px-3 py-1.5 bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-foreground font-medium">{selected.subject}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge label={selected.status} colorClass={STATUS_COLORS[selected.status] ?? 'bg-gray-100 text-gray-700'} />
                <Badge label={selected.priority} colorClass={PRIORITY_COLORS[selected.priority] ?? 'bg-gray-100 text-gray-700'} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selected.dueDate && <div className="bg-muted/30 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Due Date</p><p className="font-medium text-foreground">{new Date(selected.dueDate).toLocaleDateString('en-GB')}</p></div>}
                {selected.relatedToName && <div className="bg-muted/30 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Related To</p><p className="font-medium text-foreground">{selected.relatedToType}: {selected.relatedToName}</p></div>}
                {selected.owner && <div className="bg-muted/30 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Owner</p><p className="font-medium text-foreground">{selected.owner}</p></div>}
              </div>
              {selected.description && <div className="bg-muted/30 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Description</p><p className="text-sm text-foreground">{selected.description}</p></div>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-[600px] max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">{editMode ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="col-span-2"><FieldInput label="Subject *" value={formData.subject ?? ''} onChange={upd('subject')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <FieldSelect label="Status" value={formData.status ?? 'Not Started'} onChange={upd('status')} options={STATUSES} />
                <FieldSelect label="Priority" value={formData.priority ?? 'Normal'} onChange={upd('priority')} options={PRIORITIES} />
                <FieldInput label="Due Date" value={formData.dueDate ?? ''} onChange={upd('dueDate')} type="date" />
                <FieldInput label="Owner" value={formData.owner ?? ''} onChange={upd('owner')} />
                <FieldSelect label="Related To Type" value={formData.relatedToType ?? ''} onChange={upd('relatedToType')} options={RELATED_TYPES} />
                <FieldInput label="Related To Name" value={formData.relatedToName ?? ''} onChange={upd('relatedToName')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Description</label>
                <textarea value={formData.description ?? ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
                  {saving ? 'Saving...' : (editMode ? 'Update Task' : 'Create Task')}
                </button>
                <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border border-border/50 text-muted-foreground hover:bg-muted/50 font-medium text-sm transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-80 bg-card rounded-2xl shadow-2xl border border-border/30 p-6 mx-4">
            <h3 className="font-semibold text-foreground mb-2">Delete Task?</h3>
            <p className="text-sm text-muted-foreground mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-medium text-sm hover:bg-red-600 transition-colors">Delete</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl border border-border/50 text-muted-foreground hover:bg-muted/50 font-medium text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
