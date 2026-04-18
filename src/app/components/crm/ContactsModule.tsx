import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, User, Phone, Mail, Building2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { listRecords, createRecord, updateRecord, deleteRecord } from './crmApi';
import type { Contact, Account } from './crmTypes';

const DEPARTMENTS = ['Executive', 'Engineering', 'Operations', 'Finance', 'Sales', 'Marketing', 'IT', 'HR', 'Procurement', 'Other'];

const EMPTY: Partial<Contact> = {
  firstName: '', lastName: '', accountId: '', accountName: '', title: '', department: '',
  email: '', phone: '', mobile: '', mailingStreet: '', mailingCity: '',
  mailingState: '', mailingCountry: 'United Kingdom', description: '', owner: 'Wonder Ayobami',
};

const SEED: Partial<Contact>[] = [
  { firstName: 'John', lastName: 'Smith', accountName: 'Tesla Energy Solutions', title: 'VP Operations', department: 'Operations', email: 'john.smith@tesla-energy.com', phone: '+44 20 7946 0123', mailingCity: 'London', mailingCountry: 'United Kingdom', owner: 'Wonder Ayobami' },
  { firstName: 'Sarah', lastName: 'Lee', accountName: 'GreenPower Industries', title: 'Energy Manager', department: 'Engineering', email: 'sarah.lee@greenpower.com', phone: '+44 121 946 0301', mailingCity: 'Birmingham', mailingCountry: 'United Kingdom', owner: 'Sarah Mitchell' },
  { firstName: 'Alex', lastName: 'Kumar', accountName: 'National Grid Plc', title: 'Director of Operations', department: 'Executive', email: 'alex.kumar@nationalgrid.com', phone: '+44 20 7946 0501', mailingCity: 'London', mailingCountry: 'United Kingdom', owner: 'Wonder Ayobami' },
  { firstName: 'Lisa', lastName: 'Park', accountName: 'EcoSolutions Ltd', title: 'CEO', department: 'Executive', email: 'lisa.park@ecosolutions.com', phone: '+44 117 946 0401', mailingCity: 'Bristol', mailingCountry: 'United Kingdom', owner: 'James Okonkwo' },
  { firstName: 'Tom', lastName: 'Brown', accountName: 'SolarTech Corporation', title: 'Senior Engineer', department: 'Engineering', email: 'tom.brown@solartech.com', phone: '+44 161 946 0201', mailingCity: 'Manchester', mailingCountry: 'United Kingdom', owner: 'Sarah Mitchell' },
  { firstName: 'Amara', lastName: 'Obi', accountName: 'RenewTech Plc', title: 'Head of Procurement', department: 'Procurement', email: 'amara.obi@renewtech.com', phone: '+44 113 946 0601', mailingCity: 'Leeds', mailingCountry: 'United Kingdom', owner: 'Wonder Ayobami' },
];

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

export function ContactsModule() {
  const [records, setRecords] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Contact>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [data, accs] = await Promise.all([
        listRecords<Contact>('contact'),
        listRecords<Account>('account'),
      ]);
      setAccounts(accs);
      if (data.length === 0) {
        // link seeds to real account ids
        for (const s of SEED) {
          const acc = accs.find(a => a.name === s.accountName);
          await createRecord<Contact>('contact', { ...s, accountId: acc?.id });
        }
        const seeded = await listRecords<Contact>('contact');
        setRecords(seeded);
      } else {
        setRecords(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (e) { toast.error('Failed to load contacts'); console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => records.filter(r => {
    const q = search.toLowerCase();
    const match = !q || `${r.firstName} ${r.lastName} ${r.email} ${r.accountName}`.toLowerCase().includes(q);
    return match && (!filterDept || r.department === filterDept);
  }), [records, search, filterDept]);

  const openNew = () => { setFormData({ ...EMPTY }); setEditMode(false); setShowForm(true); setSelected(null); };
  const openEdit = (r: Contact) => { setFormData({ ...r }); setEditMode(true); setShowForm(true); setSelected(null); };
  const openView = (r: Contact) => { setSelected(r); setShowForm(false); };
  const upd = (key: keyof Contact) => (v: string) => setFormData(d => ({ ...d, [key]: v }));

  const handleAccountSelect = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    setFormData(d => ({ ...d, accountId, accountName: acc?.name ?? '' }));
  };

  const handleSave = async () => {
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      toast.error('First and last name are required'); return;
    }
    setSaving(true);
    try {
      if (editMode && formData.id) {
        const updated = await updateRecord<Contact>('contact', formData.id, formData);
        setRecords(r => r.map(x => x.id === updated.id ? updated : x));
        toast.success('Contact updated');
      } else {
        const created = await createRecord<Contact>('contact', formData);
        setRecords(r => [created, ...r]);
        toast.success('Contact created');
      }
      setShowForm(false);
    } catch (e) { toast.error('Save failed'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord('contact', id);
      setRecords(r => r.filter(x => x.id !== id));
      setDeleteId(null); setSelected(null);
      toast.success('Contact deleted');
    } catch (e) { toast.error('Delete failed'); console.error(e); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
          <p className="text-sm text-muted-foreground">{records.length} total contacts</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
          <Plus className="w-4 h-4" /> New Contact
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading contacts...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No contacts found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Account</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => openView(r)}>
                    <td className="px-4 py-3 font-medium text-foreground">{r.firstName} {r.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.accountName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
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
          <div className="w-[600px] max-h-[85vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20 rounded-t-3xl" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <div>
                <h3 className="text-white font-semibold">{selected.firstName} {selected.lastName}</h3>
                <p className="text-white/70 text-sm">{selected.title} · {selected.accountName}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null); }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteId(selected.id)} className="px-3 py-1.5 bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: User, label: 'Full Name', value: `${selected.firstName} ${selected.lastName}` },
                  { icon: Briefcase, label: 'Department', value: selected.department },
                  { icon: Building2, label: 'Account', value: selected.accountName },
                  { icon: Mail, label: 'Email', value: selected.email },
                  { icon: Phone, label: 'Phone', value: selected.phone },
                  { icon: Phone, label: 'Mobile', value: selected.mobile },
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
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-[680px] max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">{editMode ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FieldInput label="First Name *" value={formData.firstName ?? ''} onChange={upd('firstName')} />
                  <FieldInput label="Last Name *" value={formData.lastName ?? ''} onChange={upd('lastName')} />
                  <FieldInput label="Title" value={formData.title ?? ''} onChange={upd('title')} />
                  <FieldSelect label="Department" value={formData.department ?? ''} onChange={upd('department')} options={DEPARTMENTS} />
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Account</label>
                    <select value={formData.accountId ?? ''} onChange={e => handleAccountSelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">Select account...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <FieldInput label="Owner" value={formData.owner ?? ''} onChange={upd('owner')} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Contact Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FieldInput label="Email" value={formData.email ?? ''} onChange={upd('email')} type="email" />
                  <FieldInput label="Phone" value={formData.phone ?? ''} onChange={upd('phone')} />
                  <FieldInput label="Mobile" value={formData.mobile ?? ''} onChange={upd('mobile')} />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 pb-1 border-b border-border/30">Mailing Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><FieldInput label="Street" value={formData.mailingStreet ?? ''} onChange={upd('mailingStreet')} /></div>
                  <FieldInput label="City" value={formData.mailingCity ?? ''} onChange={upd('mailingCity')} />
                  <FieldInput label="State" value={formData.mailingState ?? ''} onChange={upd('mailingState')} />
                  <FieldInput label="Country" value={formData.mailingCountry ?? ''} onChange={upd('mailingCountry')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Description</label>
                <textarea value={formData.description ?? ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
                  {saving ? 'Saving...' : (editMode ? 'Update Contact' : 'Create Contact')}
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
            <h3 className="font-semibold text-foreground mb-2">Delete Contact?</h3>
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
