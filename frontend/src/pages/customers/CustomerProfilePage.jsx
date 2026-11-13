import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Building2, Pencil, Plus, Star, X, Cake, Heart } from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';
import ContactFormModal from '../contacts/ContactFormModal.jsx';

const TABS = [
  ['leads', 'Leads'], ['visits', 'Visits'], ['purchases', 'Purchases'],
  ['feedback', 'Feedback'], ['reminders', 'Reminders'], ['timeline', 'Timeline'],
];
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const dmy = (s) => (s ? s.split('-').reverse().join('/') : '—');
const OUTCOME = {
  WON: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  LOST: 'text-red-600 bg-red-50 border-red-200',
  PENDING: 'text-blue-600 bg-blue-50 border-blue-200',
};

export default function CustomerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lookups } = useLookups();

  const [data, setData]       = useState(null);
  const [tab, setTab]         = useState('leads');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [editOpen, setEditOpen]   = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [types, setTypes]     = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setData((await api.get(`/customer-hub/${id}`)).data);
    } catch (err) {
      setError(err.response?.status === 404 ? 'This customer was not found, or you do not have access to it.' : (err.response?.data?.error || 'Failed to load the customer'));
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { api.get('/masters/contact-types').then((r) => setTypes(r.data.data || [])).catch(() => {}); }, []);

  if (loading && !data) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/customers')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft className="w-4 h-4" /> Back to customers</button>
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>
      </div>
    );
  }

  const { contact: c, summary: s } = data;
  const counts = { leads: data.leads.length, visits: data.visits.length, purchases: data.purchases.length, feedback: data.feedback.length, reminders: data.reminders.length, timeline: data.timeline.length };

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> Back to customers
      </button>

      {/* Profile card */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white text-xl font-bold flex items-center justify-center shrink-0">
            {(c.firstName?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{c.firstName} {c.lastName}</h1>
              {c.type && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">{c.type}</span>}
              {c.rating ? <span className="flex items-center gap-1 text-xs text-amber-600"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {c.rating}</span> : null}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-gray-600">
              {c.phone && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" /> {c.phone}</span>}
              {c.email && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gray-400" /> {c.email}</span>}
              {(c.city || c.state) && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-gray-400" /> {[c.city, c.state, c.pincode].filter(Boolean).join(', ')}</span>}
              {c.branch && <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-gray-400" /> {c.branch}</span>}
              {c.dateOfBirth && <span className="flex items-center gap-1.5"><Cake className="w-3 h-3 text-gray-400" /> {dmy(c.dateOfBirth)}</span>}
              {c.anniversaryDate && <span className="flex items-center gap-1.5"><Heart className="w-3 h-3 text-gray-400" /> {dmy(c.anniversaryDate)}</span>}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Customer since {dmy(c.createdAt)}{c.assignedTo ? ` · Assigned to ${c.assignedTo}` : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setVisitOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold"><Plus className="w-3.5 h-3.5" /> Log Visit</button>
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"><Pencil className="w-3.5 h-3.5" /> Edit</button>
        </div>
      </section>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Tile label="LEADS" value={s.leads} />
        <Tile label="VISITS" value={s.visits} />
        <Tile label="PURCHASES" value={s.purchases} valueClass="text-emerald-600" />
        <Tile label="LIFETIME VALUE" value={inr(s.lifetimeValue)} valueClass="text-purple-600" />
        <Tile label="AVG RATING" value={s.averageRating == null ? '—' : `${s.averageRating.toFixed(1)} / 5`} valueClass="text-amber-600" />
      </div>

      {/* Tabs */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex gap-1 px-3 pt-3 border-b border-gray-100 overflow-x-auto" role="tablist">
          {TABS.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === key ? 'text-pink-600 border-pink-500' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
              {label} <span className="text-[10px] text-gray-400 ml-1">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'leads' && (
            <List empty="No leads yet" items={data.leads} render={(l) => (
              <Row key={l.id} main={`Lead #${l.leadNo}${l.source ? ` · ${l.source}` : ''}`}
                sub={`Created ${dmy(l.createdAt)}${l.stage ? ` · ${l.stage}` : ''}${l.assignedTo ? ` · ${l.assignedTo}` : ''}${l.lossReason ? ` · ${l.lossReason}` : ''}`}
                right={<span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${OUTCOME[l.outcome]}`}>{l.outcome}</span>} />
            )} />
          )}
          {tab === 'visits' && (
            <List empty="No visits logged yet" items={data.visits} render={(v) => (
              <Row key={v.id} main={dmy(v.date)} sub={`${v.notes || 'No notes'}${v.leadNo ? ` · Lead #${v.leadNo}` : ''}`} right={<span className="text-xs text-gray-400">{v.staff}</span>} />
            )} />
          )}
          {tab === 'purchases' && (
            <List empty="No purchases yet" items={data.purchases} render={(p) => (
              <Row key={p.id} main={inr(p.value)} sub={`${dmy(p.date)}${p.invoiceRef ? ` · ${p.invoiceRef}` : ''}`} right={<span className="text-xs text-gray-400">{p.owner}</span>} />
            )} />
          )}
          {tab === 'feedback' && (
            <List empty="No feedback yet" items={data.feedback} render={(f) => (
              <Row key={f.id} main={<span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {f.rating}</span>}
                sub={`${f.comment || 'No comment'} · ${dmy(f.date)}`} right={<span className="text-xs text-gray-400">{f.salesman}</span>} />
            )} />
          )}
          {tab === 'reminders' && (
            <List empty="No reminders" items={data.reminders} render={(r) => (
              <Row key={r.id} main={r.title} sub={`Due ${dmy(r.dueDate)}${r.assignedTo ? ` · ${r.assignedTo}` : ''}`}
                right={<span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${r.status === 'COMPLETED' ? OUTCOME.WON : OUTCOME.PENDING}`}>{r.status}</span>} />
            )} />
          )}
          {tab === 'timeline' && (
            <List empty="No activity recorded" items={data.timeline} render={(a) => (
              <Row key={a.id} main={a.description} sub={`${a.type.replace('_', ' ')} · ${new Date(a.at).toLocaleString('en-GB')}`} right={<span className="text-xs text-gray-400">{a.by}</span>} />
            )} />
          )}
        </div>
      </section>

      <ContactFormModal open={editOpen} onClose={() => setEditOpen(false)} initial={c}
        onSave={async (form) => { await api.put(`/contacts/${id}`, form); fetchData(); }}
        lookups={{ types, branches: lookups.branches, staff: lookups.staff }} />
      <VisitModal open={visitOpen} leads={data.leads} customerId={id} onClose={() => setVisitOpen(false)} onSaved={fetchData} />
    </div>
  );
}

function VisitModal({ open, leads, customerId, onClose, onSaved }) {
  const today = new Date().toLocaleDateString('en-CA');
  const [form, setForm] = useState({ date: today, leadId: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setForm({ date: new Date().toLocaleDateString('en-CA'), leadId: '', notes: '' }); setError(''); } }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post(`/customer-hub/${customerId}/visits`, { ...form, leadId: form.leadId || undefined });
      onSaved(); onClose();
    } catch (err) { setError(err.response?.data?.error || 'Could not log the visit'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Log visit" className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Log Visit</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <label className="block"><span className={LABEL}>VISIT DATE</span>
            <input type="date" max={today} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required className={INPUT} /></label>
          <label className="block"><span className={LABEL}>RELATED LEAD</span>
            <select value={form.leadId} onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))} className={INPUT}>
              <option value="">General visit</option>
              {leads.map((l) => <option key={l.id} value={l.id}>Lead #{l.leadNo}{l.source ? ` · ${l.source}` : ''}</option>)}
            </select></label>
          <label className="block"><span className={LABEL}>NOTES</span>
            <textarea rows={3} maxLength={1000} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="What did the customer look at?" className={`${INPUT} resize-none`} /></label>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save Visit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function List({ items, render, empty }) {
  if (!items.length) return <p className="text-sm text-gray-400 text-center py-8">{empty}</p>;
  return <ul className="divide-y divide-gray-100">{items.map(render)}</ul>;
}
function Row({ main, sub, right }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{main}</p><p className="text-xs text-gray-500 mt-0.5">{sub}</p></div>
      <div className="shrink-0">{right}</div>
    </li>
  );
}
function Tile({ label, value, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
      <p className="text-[10px] font-semibold text-gray-500 tracking-widest">{label}</p>
      <p className={`text-2xl font-bold mt-1 font-mono ${valueClass}`}>{value}</p>
    </div>
  );
}
const LABEL = 'block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5';
const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';
