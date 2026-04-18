import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, ChevronDown, User, Phone, Mail, Globe, Building2, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { listRecords, createRecord, updateRecord, deleteRecord } from './crmApi';
import type { Lead } from './crmTypes';

const STATUSES = ['New', 'Working', 'Nurturing', 'Qualified', 'Unqualified', 'Converted'];
const SOURCES = ['Web', 'Phone', 'Email', 'Partner', 'Trade Show', 'Referral', 'Other'];
const RATINGS = ['Hot', 'Warm', 'Cold'];
const INDUSTRIES = ['Energy', 'Technology', 'Manufacturing', 'Consulting', 'Utilities', 'Finance', 'Healthcare', 'Retail', 'Other'];

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Working: 'bg-amber-100 text-amber-700',
  Nurturing: 'bg-purple-100 text-purple-700',
  Qualified: 'bg-green-100 text-green-700',
  Unqualified: 'bg-gray-100 text-gray-600',
  Converted: 'bg-teal-100 text-teal-700',
};

const RATING_COLORS: Record<string, string> = {
  Hot: 'bg-red-100 text-red-700',
  Warm: 'bg-orange-100 text-orange-700',
  Cold: 'bg-sky-100 text-sky-700',
};

const EMPTY: Partial<Lead> = {
  firstName: '', lastName: '', company: '', title: '', email: '', phone: '',
  mobile: '', status: 'New', source: 'Web', rating: 'Warm', industry: '',
  annualRevenue: undefined, website: '', description: '', address: '',
  city: '', state: '', country: 'United Kingdom', postalCode: '', owner: 'Wonder Ayobami',
};

const SEED: Partial<Lead>[] = [
  { firstName: 'John', lastName: 'Smith', company: 'Tesla Energy Solutions', title: 'VP Operations', email: 'john.smith@tesla-energy.com', phone: '+44 20 7946 0123', status: 'New', source: 'Web', rating: 'Hot', industry: 'Energy', annualRevenue: 5000000, owner: 'Wonder Ayobami', city: 'London', country: 'United Kingdom' },
  { firstName: 'Maria', lastName: 'Garcia', company: 'SolarTech Corp', title: 'CEO', email: 'maria.garcia@solartech.com', phone: '+44 20 7946 0456', status: 'Working', source: 'Phone', rating: 'Warm', industry: 'Technology', annualRevenue: 2500000, owner: 'Sarah Mitchell', city: 'Manchester', country: 'United Kingdom' },
  { firstName: 'David', lastName: 'Chen', company: 'GreenPower Ltd', title: 'Director of Energy', email: 'david.chen@greenpower.com', phone: '+44 20 7946 0789', status: 'Qualified', source: 'Referral', rating: 'Hot', industry: 'Manufacturing', annualRevenue: 8000000, owner: 'Wonder Ayobami', city: 'Birmingham', country: 'United Kingdom' },
  { firstName: 'Emma', lastName: 'Wilson', company: 'EcoSolutions Ltd', title: 'Sustainability Manager', email: 'emma.wilson@ecosolutions.com', phone: '+44 20 7946 0321', status: 'Nurturing', source: 'Email', rating: 'Cold', industry: 'Consulting', annualRevenue: 1200000, owner: 'James Okonkwo', city: 'Bristol', country: 'United Kingdom' },
  { firstName: 'Robert', lastName: 'Johnson', company: 'CleanEnergy Inc', title: 'CTO', email: 'robert.johnson@cleanenergy.com', phone: '+44 20 7946 0654', status: 'New', source: 'Trade Show', rating: 'Warm', industry: 'Energy', annualRevenue: 3500000, owner: 'Sarah Mitchell', city: 'Leeds', country: 'United Kingdom' },
  { firstName: 'Sophie', lastName: 'Turner', company: 'RenewTech Plc', title: 'Head of Procurement', email: 'sophie.turner@renewtech.com', phone: '+44 20 7946 0987', status: 'Qualified', source: 'Partner', rating: 'Hot', industry: 'Energy', annualRevenue: 12000000, owner: 'Wonder Ayobami', city: 'London', country: 'United Kingdom' },
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

export function LeadsModule() {
  const [records, setRecords] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listRecords<Lead>('lead');
      if (data.length === 0) {
        for (const s of SEED) { await createRecord<Lead>('lead', s); }
        const seeded = await listRecords<Lead>('lead');
        setRecords(seeded);
      } else {
        setRecords(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (e) { toast.error('Failed to load leads'); console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    const match = !q || `${r.firstName} ${r.lastName} ${r.company} ${r.email}`.toLowerCase().includes(q);
    return match && (!filterStatus || r.status === filterStatus) && (!filterRating || r.rating === filterRating);
  }), [records, search, filterStatus, filterRating]);

  const openNew = () => { setFormData({ ...EMPTY }); setEditMode(false); setShowForm(true); setSelected(null); };
  const openEdit = (r: Lead) => { setFormData({ ...r }); setEditMode(true); setShowForm(true); setSelected(null); };
  const openView = (r: Lead) => { setSelected(r); setShowForm(false); };

  const upd = (key: keyof Lead) => (v: string) => setFormData(d => ({ ...d, [key]: v }));

  const handleSave = async () => {
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.company?.trim()) {
      toast.error('First name, last name, and company are required'); return;
    }
    setSaving(true);
    try {
      if (editMode && formData.id) {
        const updated = await updateRecord<Lead>('lead', formData.id, formData);
        setRecords(r => r.map(x => x.id === updated.id ? updated : x));
        toast.success('Lead updated');
      } else {
        const created = await createRecord<Lead>('lead', formData);
        setRecords(r => [created, ...r]);
        toast.success('Lead created');
      }
      setShowForm(false);
    } catch (e) { toast.error('Save failed'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord('lead', id);
      setRecords(r => r.filter(x => x.id !== id));
      setDeleteId(null); setSelected(null);
      toast.success('Lead deleted');
    } catch (e) { toast.error('Delete failed'); console.error(e); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Leads</h2>
          <p className="text-sm text-muted-foreground">{records.length} total leads</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
          <Plus className="w-4 h-4" /> New Lead
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterRating} onChange={e => setFilterRating(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Ratings</option>
          {RATINGS.map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No leads found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openView(r)}>
                    <td className="px-4 py-3 font-medium text-foreground">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.company}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                    <td className="px-4 py-3"><Badge label={r.status} colorClass={STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-700'} /></td>
                    <td className="px-4 py-3">{r.rating && <Badge label={r.rating} colorClass={RATING_COLORS[r.rating] ?? 'bg-gray-100 text-gray-700'} />}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.source}</td>
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

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-[640px] max-h-[85vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 bg-card border-b border-border/20 rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <div>
                <h3 className="text-white font-semibold text-base">{selected.firstName} {selected.lastName}</h3>
                <p className="text-white/70 text-sm">{selected.title} · {selected.company}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null); }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteId(selected.id)} className="px-3 py-1.5 bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex gap-3 flex-wrap">
                <Badge label={selected.status} colorClass={STATUS_COLORS[selected.status] ?? 'bg-gray-100 text-gray-700'} />
                {selected.rating && <Badge label={selected.rating} colorClass={RATING_COLORS[selected.rating] ?? 'bg-gray-100 text-gray-700'} />}
                {selected.source && <Badge label={selected.source} colorClass="bg-slate-100 text-slate-700" />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: User, label: 'Full Name', value: `${selected.firstName} ${selected.lastName}` },
                  { icon: Building2, label: 'Company', value: selected.company },
                  { icon: Mail, label: 'Email', value: selected.email },
                  { icon: Phone, label: 'Phone', value: selected.phone },
                  { icon: Phone, label: 'Mobile', value: selected.mobile },
                  { icon: Globe, label: 'Website', value: selected.website },
                  { icon: TrendingUp, label: 'Industry', value: selected.industry },
                  { icon: DollarSign, label: 'Annual Revenue', value: selected.annualRevenue ? `£${selected.annualRevenue.toLocaleString()}` : '' },
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
              <p className="text-xs text-muted-foreground">Created {new Date(selected.createdAt).toLocaleString()} · Owner: {selected.owner}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-[700px] max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 bg-card border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">{editMode ? 'Edit Lead' : 'New Lead'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Lead Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FieldInput label="First Name *" value={formData.firstName ?? ''} onChange={upd('firstName')} />
                  <FieldInput label="Last Name *" value={formData.lastName ?? ''} onChange={upd('lastName')} />
                  <FieldInput label="Title" value={formData.title ?? ''} onChange={upd('title')} />
                  <FieldInput label="Company *" value={formData.company ?? ''} onChange={upd('company')} />
                  <FieldInput label="Website" value={formData.website ?? ''} onChange={upd('website')} />
                  <FieldSelect label="Industry" value={formData.industry ?? ''} onChange={upd('industry')} options={INDUSTRIES} />
                  <FieldInput label="Annual Revenue (£)" value={formData.annualRevenue ?? ''} onChange={v => setFormData(d => ({ ...d, annualRevenue: v ? Number(v) : undefined }))} type="number" />
                  <FieldSelect label="Rating" value={formData.rating ?? ''} onChange={upd('rating')} options={RATINGS} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Status & Source</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FieldSelect label="Lead Status" value={formData.status ?? 'New'} onChange={upd('status')} options={STATUSES} />
                  <FieldSelect label="Lead Source" value={formData.source ?? ''} onChange={upd('source')} options={SOURCES} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FieldInput label="Email" value={formData.email ?? ''} onChange={upd('email')} type="email" />
                  <FieldInput label="Phone" value={formData.phone ?? ''} onChange={upd('phone')} />
                  <FieldInput label="Mobile" value={formData.mobile ?? ''} onChange={upd('mobile')} />
                  <FieldInput label="Owner" value={formData.owner ?? ''} onChange={upd('owner')} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><FieldInput label="Street Address" value={formData.address ?? ''} onChange={upd('address')} /></div>
                  <FieldInput label="City" value={formData.city ?? ''} onChange={upd('city')} />
                  <FieldInput label="State / Region" value={formData.state ?? ''} onChange={upd('state')} />
                  <FieldInput label="Postal Code" value={formData.postalCode ?? ''} onChange={upd('postalCode')} />
                  <FieldInput label="Country" value={formData.country ?? ''} onChange={upd('country')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Description</label>
                <textarea value={formData.description ?? ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
                  {saving ? 'Saving...' : (editMode ? 'Update Lead' : 'Create Lead')}
                </button>
                <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl border border-border/50 text-muted-foreground hover:bg-muted/50 font-medium text-sm transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="w-80 bg-card rounded-2xl shadow-2xl border border-border/30 p-6 mx-4">
            <h3 className="font-semibold text-foreground mb-2">Delete Lead?</h3>
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
