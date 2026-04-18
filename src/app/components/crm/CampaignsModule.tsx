import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, Megaphone, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { listRecords, createRecord, updateRecord, deleteRecord } from './crmApi';
import type { Campaign } from './crmTypes';

const TYPES = ['Email', 'Phone', 'Web', 'Banner Ads', 'Referral', 'Event', 'Social Media', 'Other'];
const STATUSES = ['Planned', 'In Progress', 'Completed', 'Aborted'];

const STATUS_COLORS: Record<string, string> = {
  Planned: 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
  Aborted: 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<string, string> = {
  Email: 'bg-sky-100 text-sky-700',
  Phone: 'bg-violet-100 text-violet-700',
  Web: 'bg-indigo-100 text-indigo-700',
  'Banner Ads': 'bg-purple-100 text-purple-700',
  Referral: 'bg-teal-100 text-teal-700',
  Event: 'bg-amber-100 text-amber-700',
  'Social Media': 'bg-pink-100 text-pink-700',
  Other: 'bg-gray-100 text-gray-600',
};

const EMPTY: Partial<Campaign> = {
  name: '', type: 'Email', status: 'Planned', startDate: '', endDate: '',
  budgetedCost: undefined, actualCost: undefined, expectedRevenue: undefined,
  expectedResponse: undefined, numberSent: undefined, description: '', owner: 'Wonder Ayobami',
};

const SEED: Partial<Campaign>[] = [
  { name: 'Q2 Green Energy Awareness', type: 'Email', status: 'In Progress', startDate: '2026-04-01', endDate: '2026-06-30', budgetedCost: 15000, actualCost: 8500, expectedRevenue: 120000, expectedResponse: 250, numberSent: 1850, owner: 'Wonder Ayobami', description: 'Email campaign targeting prospects interested in green energy solutions.' },
  { name: 'Smart Meter Rollout Campaign', type: 'Phone', status: 'Planned', startDate: '2026-05-01', endDate: '2026-07-31', budgetedCost: 22000, expectedRevenue: 280000, expectedResponse: 400, owner: 'Sarah Mitchell', description: 'Outbound calling campaign for smart meter installation promotions.' },
  { name: 'Sustainability Initiative 2026', type: 'Web', status: 'Completed', startDate: '2026-01-01', endDate: '2026-03-31', budgetedCost: 35000, actualCost: 31200, expectedRevenue: 450000, expectedResponse: 600, numberSent: 4200, owner: 'Wonder Ayobami', description: 'Web-based campaign promoting sustainability partnerships.' },
  { name: 'Trade Show — Energy Expo London', type: 'Event', status: 'Planned', startDate: '2026-09-15', endDate: '2026-09-17', budgetedCost: 45000, expectedRevenue: 750000, expectedResponse: 120, owner: 'Wonder Ayobami', description: 'Annual energy expo with booth and speaking slots.' },
  { name: 'Partner Referral Programme', type: 'Referral', status: 'In Progress', startDate: '2026-03-01', endDate: '2026-12-31', budgetedCost: 10000, actualCost: 3200, expectedRevenue: 200000, expectedResponse: 80, owner: 'Sarah Mitchell', description: 'Incentive programme for partner referrals of new enterprise clients.' },
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

export function CampaignsModule() {
  const [records, setRecords] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Campaign>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listRecords<Campaign>('campaign');
      if (data.length === 0) {
        for (const s of SEED) { await createRecord<Campaign>('campaign', s); }
        const seeded = await listRecords<Campaign>('campaign');
        setRecords(seeded);
      } else {
        setRecords(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (e) { toast.error('Failed to load campaigns'); console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    const match = !q || r.name.toLowerCase().includes(q);
    return match && (!filterStatus || r.status === filterStatus) && (!filterType || r.type === filterType);
  }), [records, search, filterStatus, filterType]);

  const openNew = () => { setFormData({ ...EMPTY }); setEditMode(false); setShowForm(true); setSelected(null); };
  const openEdit = (r: Campaign) => { setFormData({ ...r }); setEditMode(true); setShowForm(true); setSelected(null); };
  const openView = (r: Campaign) => { setSelected(r); setShowForm(false); };
  const upd = (key: keyof Campaign) => (v: string) => setFormData(d => ({ ...d, [key]: v }));

  const totalBudget = records.reduce((s, r) => s + (r.budgetedCost ?? 0), 0);
  const totalExpectedRevenue = records.reduce((s, r) => s + (r.expectedRevenue ?? 0), 0);

  const handleSave = async () => {
    if (!formData.name?.trim()) { toast.error('Campaign name is required'); return; }
    setSaving(true);
    try {
      if (editMode && formData.id) {
        const updated = await updateRecord<Campaign>('campaign', formData.id, formData);
        setRecords(r => r.map(x => x.id === updated.id ? updated : x));
        toast.success('Campaign updated');
      } else {
        const created = await createRecord<Campaign>('campaign', formData);
        setRecords(r => [created, ...r]);
        toast.success('Campaign created');
      }
      setShowForm(false);
    } catch (e) { toast.error('Save failed'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord('campaign', id);
      setRecords(r => r.filter(x => x.id !== id));
      setDeleteId(null); setSelected(null);
      toast.success('Campaign deleted');
    } catch (e) { toast.error('Delete failed'); console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
          <p className="text-sm text-muted-foreground">{records.length} total · Budget: £{(totalBudget / 1000).toFixed(0)}K · Expected Revenue: £{(totalExpectedRevenue / 1000).toFixed(0)}K</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Campaign Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground bg-card rounded-2xl border border-border/30">Loading campaigns...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground bg-card rounded-2xl border border-border/30">No campaigns found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(r => {
            const roi = r.budgetedCost && r.expectedRevenue ? ((r.expectedRevenue - r.budgetedCost) / r.budgetedCost * 100).toFixed(0) : null;
            return (
              <div key={r.id} onClick={() => openView(r)}
                className="bg-card rounded-2xl border border-border/30 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2c5f4e22, #3a6b5a22)' }}>
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); setDeleteId(r.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{r.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{r.description}</p>
                <div className="flex gap-2 mb-3">
                  <Badge label={r.status} colorClass={STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-700'} />
                  <Badge label={r.type ?? 'Other'} colorClass={TYPE_COLORS[r.type ?? 'Other'] ?? 'bg-gray-100 text-gray-700'} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {r.budgetedCost && <div className="bg-muted/40 rounded-lg px-2 py-1.5"><p className="text-muted-foreground">Budget</p><p className="font-semibold text-foreground">£{r.budgetedCost.toLocaleString()}</p></div>}
                  {r.expectedRevenue && <div className="bg-muted/40 rounded-lg px-2 py-1.5"><p className="text-muted-foreground">Expected Rev.</p><p className="font-semibold text-foreground">£{r.expectedRevenue.toLocaleString()}</p></div>}
                  {r.numberSent && <div className="bg-muted/40 rounded-lg px-2 py-1.5"><p className="text-muted-foreground">Sent</p><p className="font-semibold text-foreground">{r.numberSent.toLocaleString()}</p></div>}
                  {roi && <div className="bg-muted/40 rounded-lg px-2 py-1.5"><p className="text-muted-foreground">Expected ROI</p><p className="font-semibold text-green-600">{roi}%</p></div>}
                </div>
                {(r.startDate || r.endDate) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {r.startDate && new Date(r.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {r.endDate && ` → ${new Date(r.endDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-[620px] max-h-[85vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20 rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <div>
                <h3 className="text-white font-semibold">{selected.name}</h3>
                <p className="text-white/70 text-sm">{selected.type} Campaign</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null); }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteId(selected.id)} className="px-3 py-1.5 bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <Badge label={selected.status} colorClass={STATUS_COLORS[selected.status] ?? 'bg-gray-100 text-gray-700'} />
                <Badge label={selected.type ?? 'Other'} colorClass={TYPE_COLORS[selected.type ?? 'Other'] ?? 'bg-gray-100 text-gray-700'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Calendar, label: 'Start Date', value: selected.startDate ? new Date(selected.startDate).toLocaleDateString('en-GB') : '-' },
                  { icon: Calendar, label: 'End Date', value: selected.endDate ? new Date(selected.endDate).toLocaleDateString('en-GB') : '-' },
                  { icon: DollarSign, label: 'Budgeted Cost', value: selected.budgetedCost ? `£${selected.budgetedCost.toLocaleString()}` : '-' },
                  { icon: DollarSign, label: 'Actual Cost', value: selected.actualCost ? `£${selected.actualCost.toLocaleString()}` : '-' },
                  { icon: TrendingUp, label: 'Expected Revenue', value: selected.expectedRevenue ? `£${selected.expectedRevenue.toLocaleString()}` : '-' },
                  { icon: TrendingUp, label: 'Number Sent', value: selected.numberSent?.toLocaleString() ?? '-' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1"><Icon className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span></div>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              {selected.description && <div className="bg-muted/30 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Description</p><p className="text-sm text-foreground">{selected.description}</p></div>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-[680px] max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">{editMode ? 'Edit Campaign' : 'New Campaign'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Campaign Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><FieldInput label="Campaign Name *" value={formData.name ?? ''} onChange={upd('name')} /></div>
                  <FieldSelect label="Type" value={formData.type ?? ''} onChange={upd('type')} options={TYPES} />
                  <FieldSelect label="Status" value={formData.status ?? 'Planned'} onChange={upd('status')} options={STATUSES} />
                  <FieldInput label="Start Date" value={formData.startDate ?? ''} onChange={upd('startDate')} type="date" />
                  <FieldInput label="End Date" value={formData.endDate ?? ''} onChange={upd('endDate')} type="date" />
                  <FieldInput label="Owner" value={formData.owner ?? ''} onChange={upd('owner')} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Budget & Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FieldInput label="Budgeted Cost (£)" value={formData.budgetedCost ?? ''} onChange={v => setFormData(d => ({ ...d, budgetedCost: v ? Number(v) : undefined }))} type="number" />
                  <FieldInput label="Actual Cost (£)" value={formData.actualCost ?? ''} onChange={v => setFormData(d => ({ ...d, actualCost: v ? Number(v) : undefined }))} type="number" />
                  <FieldInput label="Expected Revenue (£)" value={formData.expectedRevenue ?? ''} onChange={v => setFormData(d => ({ ...d, expectedRevenue: v ? Number(v) : undefined }))} type="number" />
                  <FieldInput label="Expected Responses" value={formData.expectedResponse ?? ''} onChange={v => setFormData(d => ({ ...d, expectedResponse: v ? Number(v) : undefined }))} type="number" />
                  <FieldInput label="Number Sent" value={formData.numberSent ?? ''} onChange={v => setFormData(d => ({ ...d, numberSent: v ? Number(v) : undefined }))} type="number" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Description</label>
                <textarea value={formData.description ?? ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
                  {saving ? 'Saving...' : (editMode ? 'Update Campaign' : 'Create Campaign')}
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
            <h3 className="font-semibold text-foreground mb-2">Delete Campaign?</h3>
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
