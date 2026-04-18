import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, Building2, Phone, Globe, Users, DollarSign, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { listRecords, createRecord, updateRecord, deleteRecord } from './crmApi';
import type { Account } from './crmTypes';

const TYPES = ['Prospect', 'Customer', 'Partner', 'Reseller', 'Competitor', 'Other'];
const INDUSTRIES = ['Energy', 'Technology', 'Manufacturing', 'Consulting', 'Utilities', 'Finance', 'Healthcare', 'Retail', 'Real Estate', 'Other'];
const RATINGS = ['Hot', 'Warm', 'Cold'];

const TYPE_COLORS: Record<string, string> = {
  Customer: 'bg-green-100 text-green-700',
  Prospect: 'bg-blue-100 text-blue-700',
  Partner: 'bg-purple-100 text-purple-700',
  Reseller: 'bg-indigo-100 text-indigo-700',
  Competitor: 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-600',
};

const RATING_COLORS: Record<string, string> = {
  Hot: 'bg-red-100 text-red-700',
  Warm: 'bg-orange-100 text-orange-700',
  Cold: 'bg-sky-100 text-sky-700',
};

const EMPTY: Partial<Account> = {
  name: '', type: 'Prospect', industry: '', phone: '', fax: '', website: '',
  annualRevenue: undefined, numberOfEmployees: undefined, rating: 'Warm',
  billingStreet: '', billingCity: '', billingState: '', billingCountry: 'United Kingdom',
  billingPostalCode: '', description: '', owner: 'Wonder Ayobami',
};

const SEED: Partial<Account>[] = [
  { name: 'Tesla Energy Solutions', type: 'Customer', industry: 'Energy', phone: '+44 20 7946 0100', website: 'www.tesla-energy.co.uk', annualRevenue: 25000000, numberOfEmployees: 450, rating: 'Hot', billingCity: 'London', billingCountry: 'United Kingdom', owner: 'Wonder Ayobami' },
  { name: 'SolarTech Corporation', type: 'Partner', industry: 'Technology', phone: '+44 161 946 0200', website: 'www.solartech.com', annualRevenue: 12000000, numberOfEmployees: 220, rating: 'Warm', billingCity: 'Manchester', billingCountry: 'United Kingdom', owner: 'Sarah Mitchell' },
  { name: 'GreenPower Industries', type: 'Prospect', industry: 'Manufacturing', phone: '+44 121 946 0300', website: 'www.greenpower.co.uk', annualRevenue: 38000000, numberOfEmployees: 780, rating: 'Hot', billingCity: 'Birmingham', billingCountry: 'United Kingdom', owner: 'Wonder Ayobami' },
  { name: 'EcoSolutions Ltd', type: 'Customer', industry: 'Consulting', phone: '+44 117 946 0400', website: 'www.ecosolutions.co.uk', annualRevenue: 8500000, numberOfEmployees: 95, rating: 'Warm', billingCity: 'Bristol', billingCountry: 'United Kingdom', owner: 'James Okonkwo' },
  { name: 'National Grid Plc', type: 'Customer', industry: 'Utilities', phone: '+44 20 7946 0500', website: 'www.nationalgrid.com', annualRevenue: 520000000, numberOfEmployees: 23000, rating: 'Hot', billingCity: 'London', billingCountry: 'United Kingdom', owner: 'Wonder Ayobami' },
  { name: 'RenewTech Plc', type: 'Prospect', industry: 'Energy', phone: '+44 113 946 0600', website: 'www.renewtech.co.uk', annualRevenue: 19000000, numberOfEmployees: 340, rating: 'Warm', billingCity: 'Leeds', billingCountry: 'United Kingdom', owner: 'Sarah Mitchell' },
];

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>{label}</span>;
}

function FieldInput({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
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

export function AccountsModule() {
  const [records, setRecords] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [selected, setSelected] = useState<Account | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Account>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listRecords<Account>('account');
      if (data.length === 0) {
        for (const s of SEED) { await createRecord<Account>('account', s); }
        const seeded = await listRecords<Account>('account');
        setRecords(seeded);
      } else {
        setRecords(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (e) { toast.error('Failed to load accounts'); console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    const match = !q || `${r.name} ${r.industry} ${r.billingCity}`.toLowerCase().includes(q);
    return match && (!filterType || r.type === filterType) && (!filterRating || r.rating === filterRating);
  }), [records, search, filterType, filterRating]);

  const openNew = () => { setFormData({ ...EMPTY }); setEditMode(false); setShowForm(true); setSelected(null); };
  const openEdit = (r: Account) => { setFormData({ ...r }); setEditMode(true); setShowForm(true); setSelected(null); };
  const openView = (r: Account) => { setSelected(r); setShowForm(false); };
  const upd = (key: keyof Account) => (v: string) => setFormData(d => ({ ...d, [key]: v }));

  const handleSave = async () => {
    if (!formData.name?.trim()) { toast.error('Account name is required'); return; }
    setSaving(true);
    try {
      if (editMode && formData.id) {
        const updated = await updateRecord<Account>('account', formData.id, formData);
        setRecords(r => r.map(x => x.id === updated.id ? updated : x));
        toast.success('Account updated');
      } else {
        const created = await createRecord<Account>('account', formData);
        setRecords(r => [created, ...r]);
        toast.success('Account created');
      }
      setShowForm(false);
    } catch (e) { toast.error('Save failed'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord('account', id);
      setRecords(r => r.filter(x => x.id !== id));
      setDeleteId(null); setSelected(null);
      toast.success('Account deleted');
    } catch (e) { toast.error('Delete failed'); console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Accounts</h2>
          <p className="text-sm text-muted-foreground">{records.length} total accounts</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
          <Plus className="w-4 h-4" /> New Account
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterRating} onChange={e => setFilterRating(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Ratings</option>
          {RATINGS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading accounts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No accounts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Industry</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Annual Revenue</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openView(r)}>
                    <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-3"><Badge label={r.type ?? 'Other'} colorClass={TYPE_COLORS[r.type ?? 'Other'] ?? 'bg-gray-100 text-gray-600'} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.industry}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.annualRevenue ? `£${(r.annualRevenue / 1000000).toFixed(1)}M` : '-'}</td>
                    <td className="px-4 py-3">{r.rating && <Badge label={r.rating} colorClass={RATING_COLORS[r.rating] ?? 'bg-gray-100 text-gray-700'} />}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.billingCity}</td>
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
                <h3 className="text-white font-semibold text-base">{selected.name}</h3>
                <p className="text-white/70 text-sm">{selected.type} · {selected.industry}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null); }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteId(selected.id)} className="px-3 py-1.5 bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-3 flex-wrap">
                <Badge label={selected.type ?? 'Other'} colorClass={TYPE_COLORS[selected.type ?? 'Other'] ?? 'bg-gray-100 text-gray-600'} />
                {selected.rating && <Badge label={selected.rating} colorClass={RATING_COLORS[selected.rating] ?? 'bg-gray-100 text-gray-700'} />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Building2, label: 'Account Name', value: selected.name },
                  { icon: Phone, label: 'Phone', value: selected.phone },
                  { icon: Globe, label: 'Website', value: selected.website },
                  { icon: DollarSign, label: 'Annual Revenue', value: selected.annualRevenue ? `£${selected.annualRevenue.toLocaleString()}` : '' },
                  { icon: Users, label: 'Employees', value: selected.numberOfEmployees?.toLocaleString() },
                  { icon: MapPin, label: 'City', value: selected.billingCity },
                ].map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                ) : null)}
              </div>
              {selected.description && (
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-foreground">{selected.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-[700px] max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">{editMode ? 'Edit Account' : 'New Account'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Account Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><FieldInput label="Account Name *" value={formData.name ?? ''} onChange={upd('name')} /></div>
                  <FieldSelect label="Type" value={formData.type ?? ''} onChange={upd('type')} options={TYPES} />
                  <FieldSelect label="Industry" value={formData.industry ?? ''} onChange={upd('industry')} options={INDUSTRIES} />
                  <FieldInput label="Phone" value={formData.phone ?? ''} onChange={upd('phone')} />
                  <FieldInput label="Fax" value={formData.fax ?? ''} onChange={upd('fax')} />
                  <FieldInput label="Website" value={formData.website ?? ''} onChange={upd('website')} />
                  <FieldSelect label="Rating" value={formData.rating ?? ''} onChange={upd('rating')} options={RATINGS} />
                  <FieldInput label="Annual Revenue (£)" value={formData.annualRevenue ?? ''} onChange={v => setFormData(d => ({ ...d, annualRevenue: v ? Number(v) : undefined }))} type="number" />
                  <FieldInput label="Number of Employees" value={formData.numberOfEmployees ?? ''} onChange={v => setFormData(d => ({ ...d, numberOfEmployees: v ? Number(v) : undefined }))} type="number" />
                  <FieldInput label="Owner" value={formData.owner ?? ''} onChange={upd('owner')} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Billing Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><FieldInput label="Street" value={formData.billingStreet ?? ''} onChange={upd('billingStreet')} /></div>
                  <FieldInput label="City" value={formData.billingCity ?? ''} onChange={upd('billingCity')} />
                  <FieldInput label="State" value={formData.billingState ?? ''} onChange={upd('billingState')} />
                  <FieldInput label="Postal Code" value={formData.billingPostalCode ?? ''} onChange={upd('billingPostalCode')} />
                  <FieldInput label="Country" value={formData.billingCountry ?? ''} onChange={upd('billingCountry')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Description</label>
                <textarea value={formData.description ?? ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
                  {saving ? 'Saving...' : (editMode ? 'Update Account' : 'Create Account')}
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
            <h3 className="font-semibold text-foreground mb-2">Delete Account?</h3>
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
