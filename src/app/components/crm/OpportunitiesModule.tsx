import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, Target, DollarSign, Calendar, TrendingUp, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import { listRecords, createRecord, updateRecord, deleteRecord } from './crmApi';
import type { Opportunity, Account } from './crmTypes';

const STAGES = ['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Decision Makers', 'Perception Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'];
const TYPES = ['New Customer', 'Existing Customer - Upgrade', 'Existing Customer - Renewal', 'Existing Customer - Downgrade'];
const SOURCES = ['Web', 'Phone', 'Email', 'Partner', 'Trade Show', 'Referral', 'Other'];

const STAGE_COLORS: Record<string, string> = {
  'Prospecting': 'bg-slate-100 text-slate-700',
  'Qualification': 'bg-blue-100 text-blue-700',
  'Needs Analysis': 'bg-indigo-100 text-indigo-700',
  'Value Proposition': 'bg-violet-100 text-violet-700',
  'Decision Makers': 'bg-purple-100 text-purple-700',
  'Perception Analysis': 'bg-fuchsia-100 text-fuchsia-700',
  'Proposal/Price Quote': 'bg-amber-100 text-amber-700',
  'Negotiation/Review': 'bg-orange-100 text-orange-700',
  'Closed Won': 'bg-green-100 text-green-700',
  'Closed Lost': 'bg-red-100 text-red-700',
};

const STAGE_PROBS: Record<string, number> = {
  'Prospecting': 10, 'Qualification': 20, 'Needs Analysis': 25, 'Value Proposition': 50,
  'Decision Makers': 60, 'Perception Analysis': 70, 'Proposal/Price Quote': 75,
  'Negotiation/Review': 90, 'Closed Won': 100, 'Closed Lost': 0,
};

const KANBAN_STAGES = ['Prospecting', 'Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won'];

const EMPTY: Partial<Opportunity> = {
  name: '', accountId: '', accountName: '', stage: 'Prospecting', amount: undefined,
  closeDate: '', probability: 10, type: 'New Customer', leadSource: '', description: '', owner: 'Wonder Ayobami',
};

const SEED: Partial<Opportunity>[] = [
  { name: 'Tesla Energy System Upgrade', accountName: 'Tesla Energy Solutions', stage: 'Proposal/Price Quote', amount: 250000, closeDate: '2026-06-30', probability: 75, type: 'Existing Customer - Upgrade', leadSource: 'Web', owner: 'Wonder Ayobami' },
  { name: 'GreenPower Solar Installation', accountName: 'GreenPower Industries', stage: 'Needs Analysis', amount: 180000, closeDate: '2026-07-15', probability: 25, type: 'New Customer', leadSource: 'Referral', owner: 'Wonder Ayobami' },
  { name: 'National Grid Smart Meters Contract', accountName: 'National Grid Plc', stage: 'Closed Won', amount: 450000, closeDate: '2026-03-31', probability: 100, type: 'Existing Customer - Upgrade', leadSource: 'Partner', owner: 'Wonder Ayobami' },
  { name: 'EcoSolutions Energy Audit', accountName: 'EcoSolutions Ltd', stage: 'Prospecting', amount: 75000, closeDate: '2026-08-31', probability: 10, type: 'New Customer', leadSource: 'Email', owner: 'Sarah Mitchell' },
  { name: 'SolarTech Partnership Deal', accountName: 'SolarTech Corporation', stage: 'Negotiation/Review', amount: 320000, closeDate: '2026-05-20', probability: 90, type: 'New Customer', leadSource: 'Phone', owner: 'Wonder Ayobami' },
  { name: 'RenewTech Platform Subscription', accountName: 'RenewTech Plc', stage: 'Qualification', amount: 95000, closeDate: '2026-09-30', probability: 20, type: 'New Customer', leadSource: 'Web', owner: 'Sarah Mitchell' },
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

export function OpportunitiesModule() {
  const [records, setRecords] = useState<Opportunity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Opportunity>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, accs] = await Promise.all([
        listRecords<Opportunity>('opportunity'),
        listRecords<Account>('account'),
      ]);
      setAccounts(accs);
      if (data.length === 0) {
        for (const s of SEED) {
          const acc = accs.find(a => a.name === s.accountName);
          await createRecord<Opportunity>('opportunity', { ...s, accountId: acc?.id });
        }
        const seeded = await listRecords<Opportunity>('opportunity');
        setRecords(seeded);
      } else {
        setRecords(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (e) { toast.error('Failed to load opportunities'); console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    const match = !q || `${r.name} ${r.accountName}`.toLowerCase().includes(q);
    return match && (!filterStage || r.stage === filterStage);
  }), [records, search, filterStage]);

  const totalValue = records.filter(r => r.stage !== 'Closed Lost').reduce((s, r) => s + (r.amount ?? 0), 0);
  const wonValue = records.filter(r => r.stage === 'Closed Won').reduce((s, r) => s + (r.amount ?? 0), 0);

  const openNew = () => { setFormData({ ...EMPTY }); setEditMode(false); setShowForm(true); setSelected(null); };
  const openEdit = (r: Opportunity) => { setFormData({ ...r }); setEditMode(true); setShowForm(true); setSelected(null); };
  const openView = (r: Opportunity) => { setSelected(r); setShowForm(false); };
  const upd = (key: keyof Opportunity) => (v: string) => setFormData(d => ({ ...d, [key]: v }));

  const handleStageChange = (stage: string) => {
    setFormData(d => ({ ...d, stage, probability: STAGE_PROBS[stage] ?? d.probability }));
  };

  const handleAccountSelect = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    setFormData(d => ({ ...d, accountId, accountName: acc?.name ?? '' }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) { toast.error('Opportunity name is required'); return; }
    setSaving(true);
    try {
      if (editMode && formData.id) {
        const updated = await updateRecord<Opportunity>('opportunity', formData.id, formData);
        setRecords(r => r.map(x => x.id === updated.id ? updated : x));
        toast.success('Opportunity updated');
      } else {
        const created = await createRecord<Opportunity>('opportunity', formData);
        setRecords(r => [created, ...r]);
        toast.success('Opportunity created');
      }
      setShowForm(false);
    } catch (e) { toast.error('Save failed'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord('opportunity', id);
      setRecords(r => r.filter(x => x.id !== id));
      setDeleteId(null); setSelected(null);
      toast.success('Opportunity deleted');
    } catch (e) { toast.error('Delete failed'); console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Opportunities</h2>
          <p className="text-sm text-muted-foreground">{records.length} total · Pipeline: £{totalValue.toLocaleString()} · Won: £{wonValue.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
            <Plus className="w-4 h-4" /> New Opportunity
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-card rounded-2xl border border-border/30 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading opportunities...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No opportunities found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Opportunity Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Close Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Probability</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openView(r)}>
                      <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.accountName}</td>
                      <td className="px-4 py-3"><Badge label={r.stage} colorClass={STAGE_COLORS[r.stage] ?? 'bg-gray-100 text-gray-700'} /></td>
                      <td className="px-4 py-3 text-foreground font-medium">{r.amount ? `£${r.amount.toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.closeDate ? new Date(r.closeDate).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-muted rounded-full h-1.5"><div className="h-full rounded-full bg-primary" style={{ width: `${r.probability ?? 0}%` }} /></div>
                          <span className="text-xs text-muted-foreground">{r.probability ?? 0}%</span>
                        </div>
                      </td>
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
      ) : (
        // Kanban / Pipeline View
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {KANBAN_STAGES.map(stage => {
              const stageRecords = filtered.filter(r => r.stage === stage);
              const stageValue = stageRecords.reduce((s, r) => s + (r.amount ?? 0), 0);
              return (
                <div key={stage} className="w-72 flex-shrink-0">
                  <div className="bg-muted/50 rounded-2xl p-3 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{stage}</p>
                        <p className="text-xs text-muted-foreground">{stageRecords.length} records · £{stageValue.toLocaleString()}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLORS[stage] ?? 'bg-gray-100 text-gray-700'}`}>{STAGE_PROBS[stage]}%</span>
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {stageRecords.map(r => (
                        <div key={r.id} onClick={() => openView(r)} className="bg-card rounded-xl p-3 border border-border/20 cursor-pointer hover:shadow-md transition-all hover:border-primary/30">
                          <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.accountName}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-semibold text-primary">£{(r.amount ?? 0).toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{r.closeDate ? new Date(r.closeDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : ''}</span>
                          </div>
                        </div>
                      ))}
                      {stageRecords.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No opportunities</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-[600px] max-h-[85vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20 rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <div>
                <h3 className="text-white font-semibold">{selected.name}</h3>
                <p className="text-white/70 text-sm">{selected.accountName}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null); }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteId(selected.id)} className="px-3 py-1.5 bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <Badge label={selected.stage} colorClass={STAGE_COLORS[selected.stage] ?? 'bg-gray-100 text-gray-700'} />
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Target, label: 'Opportunity', value: selected.name },
                  { icon: TrendingUp, label: 'Account', value: selected.accountName },
                  { icon: DollarSign, label: 'Amount', value: selected.amount ? `£${selected.amount.toLocaleString()}` : '-' },
                  { icon: Calendar, label: 'Close Date', value: selected.closeDate ? new Date(selected.closeDate).toLocaleDateString('en-GB') : '-' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1"><Icon className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span></div>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Probability</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-muted rounded-full h-2"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${selected.probability ?? 0}%` }} /></div>
                  <span className="text-sm font-medium text-foreground">{selected.probability ?? 0}%</span>
                </div>
              </div>
              {selected.description && <div className="bg-muted/30 rounded-xl p-3"><p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Description</p><p className="text-sm text-foreground">{selected.description}</p></div>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-[680px] max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">{editMode ? 'Edit Opportunity' : 'New Opportunity'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Opportunity Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><FieldInput label="Opportunity Name *" value={formData.name ?? ''} onChange={upd('name')} /></div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Account</label>
                    <select value={formData.accountId ?? ''} onChange={e => handleAccountSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Select account...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Stage</label>
                    <select value={formData.stage ?? 'Prospecting'} onChange={e => handleStageChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {STAGES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <FieldInput label="Amount (£)" value={formData.amount ?? ''} onChange={v => setFormData(d => ({ ...d, amount: v ? Number(v) : undefined }))} type="number" />
                  <FieldInput label="Close Date" value={formData.closeDate ?? ''} onChange={upd('closeDate')} type="date" />
                  <FieldInput label="Probability (%)" value={formData.probability ?? ''} onChange={v => setFormData(d => ({ ...d, probability: v ? Number(v) : undefined }))} type="number" />
                  <FieldSelect label="Type" value={formData.type ?? ''} onChange={upd('type')} options={TYPES} />
                  <FieldSelect label="Lead Source" value={formData.leadSource ?? ''} onChange={upd('leadSource')} options={SOURCES} />
                  <FieldInput label="Owner" value={formData.owner ?? ''} onChange={upd('owner')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Description</label>
                <textarea value={formData.description ?? ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
                  {saving ? 'Saving...' : (editMode ? 'Update Opportunity' : 'Create Opportunity')}
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
            <h3 className="font-semibold text-foreground mb-2">Delete Opportunity?</h3>
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
