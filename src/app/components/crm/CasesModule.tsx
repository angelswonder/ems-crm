import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertCircle, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { listRecords, createRecord, updateRecord, deleteRecord } from './crmApi';
import type { Case, Account, Contact } from './crmTypes';

const STATUSES = ['New', 'Working', 'Escalated', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TYPES = ['Question', 'Problem', 'Feature Request'];
const ORIGINS = ['Phone', 'Email', 'Web', 'Social'];

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Working: 'bg-amber-100 text-amber-700',
  Escalated: 'bg-red-100 text-red-700',
  Closed: 'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const EMPTY: Partial<Case> = {
  subject: '', description: '', accountId: '', accountName: '', contactId: '', contactName: '',
  status: 'New', priority: 'Medium', type: 'Problem', origin: 'Email', resolution: '', owner: 'Wonder Ayobami',
};

const SEED: Partial<Case>[] = [
  { subject: 'Smart meter not transmitting data', description: 'The smart meter at Site 3 has stopped sending readings for the past 48 hours.', accountName: 'National Grid Plc', status: 'Escalated', priority: 'Critical', type: 'Problem', origin: 'Phone', owner: 'Wonder Ayobami' },
  { subject: 'Billing discrepancy in March invoice', description: 'Client reported an overbilling of £4,200 on their latest invoice.', accountName: 'Tesla Energy Solutions', status: 'Working', priority: 'High', type: 'Problem', origin: 'Email', owner: 'Sarah Mitchell' },
  { subject: 'Request for additional monitoring points', description: 'Customer wants to add 5 more monitoring points to their existing contract.', accountName: 'GreenPower Industries', status: 'New', priority: 'Medium', type: 'Feature Request', origin: 'Web', owner: 'James Okonkwo' },
  { subject: 'How to export monthly reports?', description: 'User needs guidance on exporting consumption data to CSV format.', accountName: 'EcoSolutions Ltd', status: 'Closed', priority: 'Low', type: 'Question', origin: 'Email', owner: 'Sarah Mitchell', resolution: 'Provided step-by-step guide via email.' },
  { subject: 'System outage during peak hours', description: 'Energy monitoring system went offline between 2PM-4PM causing data loss.', accountName: 'SolarTech Corporation', status: 'Working', priority: 'High', type: 'Problem', origin: 'Phone', owner: 'Wonder Ayobami' },
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

export function CasesModule() {
  const [records, setRecords] = useState<Case[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected] = useState<Case | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Case>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, accs, ctcs] = await Promise.all([
        listRecords<Case>('case'),
        listRecords<Account>('account'),
        listRecords<Contact>('contact'),
      ]);
      setAccounts(accs); setContacts(ctcs);
      if (data.length === 0) {
        for (const s of SEED) {
          const acc = accs.find(a => a.name === s.accountName);
          await createRecord<Case>('case', { ...s, accountId: acc?.id });
        }
        const seeded = await listRecords<Case>('case');
        setRecords(seeded);
      } else {
        setRecords(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (e) { toast.error('Failed to load cases'); console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    const match = !q || `${r.subject} ${r.caseNumber} ${r.accountName}`.toLowerCase().includes(q);
    return match && (!filterStatus || r.status === filterStatus) && (!filterPriority || r.priority === filterPriority);
  }), [records, search, filterStatus, filterPriority]);

  const openNew = () => { setFormData({ ...EMPTY }); setEditMode(false); setShowForm(true); setSelected(null); };
  const openEdit = (r: Case) => { setFormData({ ...r }); setEditMode(true); setShowForm(true); setSelected(null); };
  const openView = (r: Case) => { setSelected(r); setShowForm(false); };
  const upd = (key: keyof Case) => (v: string) => setFormData(d => ({ ...d, [key]: v }));

  const handleAccountSelect = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    setFormData(d => ({ ...d, accountId, accountName: acc?.name ?? '' }));
  };
  const handleContactSelect = (contactId: string) => {
    const c = contacts.find(x => x.id === contactId);
    setFormData(d => ({ ...d, contactId, contactName: c ? `${c.firstName} ${c.lastName}` : '' }));
  };

  const handleSave = async () => {
    if (!formData.subject?.trim()) { toast.error('Subject is required'); return; }
    setSaving(true);
    try {
      if (editMode && formData.id) {
        const updated = await updateRecord<Case>('case', formData.id, formData);
        setRecords(r => r.map(x => x.id === updated.id ? updated : x));
        toast.success('Case updated');
      } else {
        const created = await createRecord<Case>('case', formData);
        setRecords(r => [created, ...r]);
        toast.success('Case created');
      }
      setShowForm(false);
    } catch (e) { toast.error('Save failed'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord('case', id);
      setRecords(r => r.filter(x => x.id !== id));
      setDeleteId(null); setSelected(null);
      toast.success('Case deleted');
    } catch (e) { toast.error('Delete failed'); console.error(e); }
  };

  const openCount = records.filter(r => r.status !== 'Closed').length;
  const criticalCount = records.filter(r => r.priority === 'Critical' && r.status !== 'Closed').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cases</h2>
          <p className="text-sm text-muted-foreground">{records.length} total · {openCount} open · {criticalCount} critical</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
          <Plus className="w-4 h-4" /> New Case
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases..."
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
          <div className="p-12 text-center text-muted-foreground">Loading cases...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No cases found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Origin</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openView(r)}>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{r.caseNumber}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{r.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.accountName}</td>
                    <td className="px-4 py-3"><Badge label={r.status} colorClass={STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-700'} /></td>
                    <td className="px-4 py-3"><Badge label={r.priority} colorClass={PRIORITY_COLORS[r.priority] ?? 'bg-gray-100 text-gray-700'} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.origin}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-[640px] max-h-[85vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20 rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <div>
                <h3 className="text-white font-semibold">Case #{selected.caseNumber}</h3>
                <p className="text-white/70 text-sm truncate max-w-[300px]">{selected.subject}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null); }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteId(selected.id)} className="px-3 py-1.5 bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3 flex-wrap">
                <Badge label={selected.status} colorClass={STATUS_COLORS[selected.status] ?? 'bg-gray-100 text-gray-700'} />
                <Badge label={selected.priority} colorClass={PRIORITY_COLORS[selected.priority] ?? 'bg-gray-100 text-gray-700'} />
                {selected.type && <Badge label={selected.type} colorClass="bg-slate-100 text-slate-700" />}
                {selected.origin && <Badge label={selected.origin} colorClass="bg-violet-100 text-violet-700" />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Hash, label: 'Case Number', value: `#${selected.caseNumber}` },
                  { icon: AlertCircle, label: 'Account', value: selected.accountName },
                ].map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1"><Icon className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span></div>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                ) : null)}
              </div>
              <div className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-foreground">{selected.description}</p>
              </div>
              {selected.resolution && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs text-green-700 font-medium uppercase tracking-wide mb-1">Resolution</p>
                  <p className="text-sm text-green-800">{selected.resolution}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Owner: {selected.owner} · Created {new Date(selected.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-[680px] max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">{editMode ? 'Edit Case' : 'New Case'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Case Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><FieldInput label="Subject *" value={formData.subject ?? ''} onChange={upd('subject')} /></div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Account</label>
                    <select value={formData.accountId ?? ''} onChange={e => handleAccountSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Select account...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Contact</label>
                    <select value={formData.contactId ?? ''} onChange={e => handleContactSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Select contact...</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                    </select>
                  </div>
                  <FieldSelect label="Status" value={formData.status ?? 'New'} onChange={upd('status')} options={STATUSES} />
                  <FieldSelect label="Priority" value={formData.priority ?? 'Medium'} onChange={upd('priority')} options={PRIORITIES} />
                  <FieldSelect label="Type" value={formData.type ?? ''} onChange={upd('type')} options={TYPES} />
                  <FieldSelect label="Case Origin" value={formData.origin ?? ''} onChange={upd('origin')} options={ORIGINS} />
                  <FieldInput label="Owner" value={formData.owner ?? ''} onChange={upd('owner')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Description</label>
                <textarea value={formData.description ?? ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Resolution (if closed)</label>
                <textarea value={formData.resolution ?? ''} onChange={e => setFormData(d => ({ ...d, resolution: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
                  {saving ? 'Saving...' : (editMode ? 'Update Case' : 'Create Case')}
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
            <h3 className="font-semibold text-foreground mb-2">Delete Case?</h3>
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
