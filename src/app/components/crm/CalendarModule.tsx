import { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, Edit2, Trash2, Clock, MapPin, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { listRecords, createRecord, updateRecord, deleteRecord } from './crmApi';
import type { CalendarEvent } from './crmTypes';

const EVENT_TYPES = ['Call', 'Meeting', 'Demo', 'Site Visit', 'Email', 'Other'];

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Call: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  Meeting: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  Demo: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  'Site Visit': { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  Email: { bg: 'bg-sky-100', text: 'text-sky-800', dot: 'bg-sky-500' },
  Other: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
};

const EMPTY: Partial<CalendarEvent> = {
  subject: '', startDatetime: '', endDatetime: '', location: '',
  isAllDay: false, description: '', type: 'Meeting', relatedToType: '', relatedToName: '', owner: 'Wonder Ayobami',
};

function getThisMonthSeeds(): Partial<CalendarEvent>[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return [
    { subject: 'Site Visit - Tesla Energy', startDatetime: `${y}-${m}-22T09:00`, endDatetime: `${y}-${m}-22T11:00`, location: 'London Industrial Estate, E1', type: 'Site Visit', relatedToType: 'Account', relatedToName: 'Tesla Energy Solutions', owner: 'Wonder Ayobami' },
    { subject: 'Proposal Presentation - GreenPower', startDatetime: `${y}-${m}-24T14:00`, endDatetime: `${y}-${m}-24T15:30`, location: 'Video Call - Zoom', type: 'Meeting', relatedToType: 'Opportunity', relatedToName: 'GreenPower Solar Installation', owner: 'Wonder Ayobami' },
    { subject: 'Onboarding Call - SolarTech', startDatetime: `${y}-${m}-25T10:00`, endDatetime: `${y}-${m}-25T10:30`, location: 'Phone', type: 'Call', relatedToType: 'Account', relatedToName: 'SolarTech Corporation', owner: 'Sarah Mitchell' },
    { subject: 'Q2 Energy Review - National Grid', startDatetime: `${y}-${m}-28T13:00`, endDatetime: `${y}-${m}-28T15:00`, location: 'National Grid HQ, London', type: 'Meeting', relatedToType: 'Account', relatedToName: 'National Grid Plc', owner: 'Wonder Ayobami' },
    { subject: 'EcoSolutions Demo', startDatetime: `${y}-${m}-30T11:00`, endDatetime: `${y}-${m}-30T12:00`, location: 'Bristol Office', type: 'Demo', relatedToType: 'Opportunity', relatedToName: 'EcoSolutions Energy Audit', owner: 'James Okonkwo' },
  ];
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export function CalendarModule() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<CalendarEvent>>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listRecords<CalendarEvent>('event');
      if (data.length === 0) {
        const seeds = getThisMonthSeeds();
        for (const s of seeds) { await createRecord<CalendarEvent>('event', s); }
        const seeded = await listRecords<CalendarEvent>('event');
        setEvents(seeded);
      } else {
        setEvents(data.sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()));
      }
    } catch (e) { toast.error('Failed to load events'); console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const eventsInMonth = useMemo(() => events.filter(e => {
    const d = new Date(e.startDatetime);
    return d.getFullYear() === year && d.getMonth() === month;
  }), [events, year, month]);

  const eventsOnDay = (day: number) => eventsInMonth.filter(e => new Date(e.startDatetime).getDate() === day);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events.filter(e => new Date(e.startDatetime) >= now).slice(0, 8);
  }, [events]);

  const openNew = (dayStr?: string) => {
    const dt = dayStr ? `${dayStr}T09:00` : '';
    setFormData({ ...EMPTY, startDatetime: dt, endDatetime: dt.replace('T09:00', 'T10:00') });
    setEditMode(false); setShowForm(true); setSelected(null);
  };
  const openEdit = (e: CalendarEvent) => { setFormData({ ...e }); setEditMode(true); setShowForm(true); setSelected(null); };
  const upd = (key: keyof CalendarEvent) => (v: string) => setFormData(d => ({ ...d, [key]: v }));

  const handleSave = async () => {
    if (!formData.subject?.trim()) { toast.error('Subject is required'); return; }
    setSaving(true);
    try {
      if (editMode && formData.id) {
        const updated = await updateRecord<CalendarEvent>('event', formData.id, formData);
        setEvents(r => r.map(x => x.id === updated.id ? updated : x));
        toast.success('Event updated');
      } else {
        const created = await createRecord<CalendarEvent>('event', formData);
        setEvents(r => [created, ...r].sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()));
        toast.success('Event created');
      }
      setShowForm(false);
    } catch (e) { toast.error('Save failed'); console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord('event', id);
      setEvents(r => r.filter(x => x.id !== id));
      setDeleteId(null); setSelected(null);
      toast.success('Event deleted');
    } catch (e) { toast.error('Delete failed'); console.error(e); }
  };

  const today = new Date();
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const dayStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Calendar</h2>
          <p className="text-sm text-muted-foreground">{events.length} total events</p>
        </div>
        <button onClick={() => openNew()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border/30 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
            <h3 className="font-semibold text-foreground">{monthName}</h3>
            <div className="flex gap-1">
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 h-8 rounded-lg text-xs font-medium hover:bg-muted transition-colors text-muted-foreground">Today</button>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-border/20">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/10 bg-muted/10" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsOnDay(day);
                return (
                  <div key={day} onClick={() => openNew(dayStr(day))}
                    className={`min-h-[80px] border-b border-r border-border/10 p-1 cursor-pointer hover:bg-muted/20 transition-colors ${isToday(day) ? 'bg-primary/5' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${isToday(day) ? 'bg-primary text-white' : 'text-foreground'}`}>{day}</div>
                    {dayEvents.slice(0, 2).map(ev => {
                      const colors = TYPE_COLORS[ev.type ?? 'Other'] ?? TYPE_COLORS.Other;
                      return (
                        <div key={ev.id} onClick={e => { e.stopPropagation(); setSelected(ev); }}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md mb-0.5 truncate cursor-pointer hover:opacity-80 ${colors.bg} ${colors.text} font-medium`}>
                          {ev.subject}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 2} more</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-card rounded-2xl border border-border/30 shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-border/20">
            <h3 className="font-semibold text-foreground text-sm">Upcoming Events</h3>
          </div>
          <div className="divide-y divide-border/20 max-h-[500px] overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No upcoming events</p>
            ) : upcomingEvents.map(ev => {
              const colors = TYPE_COLORS[ev.type ?? 'Other'] ?? TYPE_COLORS.Other;
              const start = new Date(ev.startDatetime);
              return (
                <div key={ev.id} className="px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelected(ev)}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${colors.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{ev.subject}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {start.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} · {start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${colors.bg} ${colors.text}`}>{ev.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="w-[520px] bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between rounded-t-3xl border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <div>
                <h3 className="text-white font-semibold">{selected.subject}</h3>
                <p className="text-white/70 text-sm">{selected.type}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { openEdit(selected); setSelected(null); }} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors">Edit</button>
                <button onClick={() => setDeleteId(selected.id)} className="px-3 py-1.5 bg-red-500/70 hover:bg-red-500/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Start</p>
                  <p className="text-sm font-medium text-foreground">{new Date(selected.startDatetime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">End</p>
                  <p className="text-sm font-medium text-foreground">{selected.endDatetime ? new Date(selected.endDatetime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}</p>
                </div>
                {selected.location && (
                  <div className="col-span-2 bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Location</p>
                    <p className="text-sm font-medium text-foreground">{selected.location}</p>
                  </div>
                )}
              </div>
              {selected.relatedToName && <p className="text-xs text-muted-foreground">{selected.relatedToType}: {selected.relatedToName}</p>}
              {selected.description && <div className="bg-muted/30 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground">{selected.description}</p></div>}
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-[620px] max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between sticky top-0 border-b border-border/20" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
              <h3 className="text-white font-semibold">{editMode ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"><X className="w-4 h-4 text-white" /></button>
            </div>
            <div className="p-6 space-y-4">
              <FieldInput label="Subject *" value={formData.subject ?? ''} onChange={upd('subject')} />
              <div className="grid grid-cols-2 gap-4">
                <FieldInput label="Start Date & Time" value={formData.startDatetime ?? ''} onChange={upd('startDatetime')} type="datetime-local" />
                <FieldInput label="End Date & Time" value={formData.endDatetime ?? ''} onChange={upd('endDatetime')} type="datetime-local" />
                <FieldSelect label="Type" value={formData.type ?? ''} onChange={upd('type')} options={EVENT_TYPES} />
                <FieldInput label="Location" value={formData.location ?? ''} onChange={upd('location')} />
                <FieldInput label="Related To Name" value={formData.relatedToName ?? ''} onChange={upd('relatedToName')} />
                <FieldInput label="Owner" value={formData.owner ?? ''} onChange={upd('owner')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Description</label>
                <textarea value={formData.description ?? ''} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #2c5f4e, #3a6b5a)' }}>
                  {saving ? 'Saving...' : (editMode ? 'Update Event' : 'Create Event')}
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
            <h3 className="font-semibold text-foreground mb-2">Delete Event?</h3>
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
