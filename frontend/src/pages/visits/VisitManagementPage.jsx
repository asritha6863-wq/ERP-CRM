import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Maximize2, User, Grid3x3, List, Search, X, CheckCircle2, Clock, XCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useLookups from '../../hooks/useLookups.js';
import Pagination from '../../components/ui/Pagination.jsx';

const PAGE_SIZE = 12;
const TODAY = new Date().toLocaleDateString('en-CA');

const STATUS_STYLE = {
  IN_PROGRESS: { bar: 'text-pink-600 bg-pink-50 border-pink-200',    icon: Clock,         label: 'IN PROGRESS' },
  COMPLETED:   { bar: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2, label: 'COMPLETED' },
  CANCELLED:   { bar: 'text-gray-500 bg-gray-100 border-gray-200',    icon: XCircle,       label: 'CANCELLED' },
};
const VIEWS = [
  { id: '',         label: 'All Visits'       },
  { id: 'created',  label: 'My Created Visits' },
  { id: 'assigned', label: 'My Assigned Visits' },
];
const SALUTATIONS = ['Mr', 'Mrs', 'Ms', 'Dr'];
const CATEGORIES  = ['Gold', 'Diamond', 'Silver', 'Platinum', 'Other'];
const COUNTERS    = ['Gold', 'Diamond', 'Silver', 'Platinum', 'Necklace', 'Bangle', 'Earing', 'Ring', 'Other'];

const dmy = (s) => (s ? s.split('-').reverse().join('/') : '—');

export default function VisitManagementPage() {
  const { user } = useAuth();
  const { lookups } = useLookups();

  const [view, setView]       = useState('');
  const [layout, setLayout]   = useState('card');
  const [page, setPage]       = useState(1);
  const [result, setResult]   = useState({ data: [], total: 0, pages: 1, counters: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [filters, setFilters] = useState({ dateFrom: TODAY, dateTo: TODAY, userId: '', status: '', counter: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { ...filters, view, page, limit: PAGE_SIZE };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/visits', { params });
      setResult((r) => ({ counters: [], ...r, ...res.data }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load visits');
    } finally { setLoading(false); }
  }, [filters, view, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setFilter = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const reset = () => { setFilters({ dateFrom: TODAY, dateTo: TODAY, userId: '', status: '', counter: '', search: '' }); setPage(1); };

  const statusChange = async (id, status) => {
    try { await api.put(`/visits/${id}`, { status }); fetchData(); }
    catch (err) { setError(err.response?.data?.error || 'Could not update visit'); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Visit Pipeline</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">Store Footfall</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Manage walk-ins, consultations and conversions in real-time</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL VISITS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{result.total.toLocaleString('en-IN')}</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-gray-500" /></span>
          </div>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand"><Maximize2 className="w-4 h-4" /></button>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            {[['card', Grid3x3], ['list', List]].map(([id, Icon]) => (
              <button key={id} onClick={() => setLayout(id)} aria-pressed={layout === id}
                className={`p-1.5 rounded-md ${layout === id ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> New Visit
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => { setView(v.id); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {v.id === 'created'  && <User className="w-3.5 h-3.5" />}
            {v.id === 'assigned' && <User className="w-3.5 h-3.5" />}
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="grid grid-cols-2 gap-2">
          <FilterField label="Date Range">
            <input type="date" value={filters.dateFrom} onChange={setFilter('dateFrom')} className={INPUT} />
          </FilterField>
          <FilterField label=" ">
            <input type="date" value={filters.dateTo} onChange={setFilter('dateTo')} className={INPUT} />
          </FilterField>
        </div>
        <FilterField label="Staff">
          <select value={filters.userId} onChange={setFilter('userId')} className={INPUT}>
            <option value="">All Staff</option>
            {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select value={filters.status} onChange={setFilter('status')} className={INPUT}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </FilterField>
        <FilterField label="Counter">
          <select value={filters.counter} onChange={setFilter('counter')} className={INPUT}>
            <option value="">All Counters</option>
            {[...new Set([...COUNTERS, ...(result.counters || [])])].filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FilterField>
        <FilterField label="Search Customer">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={filters.search} onChange={setFilter('search')} placeholder="Name or phone..." className={`${INPUT} pl-9 w-44`} />
          </div>
        </FilterField>
        <button onClick={reset} className="mb-0.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Reset</button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && result.data.length === 0 && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && result.data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-16 bg-white border border-gray-200 rounded-2xl">No visits found. Log the first one with + New Visit.</p>
      )}

      {layout === 'card' && result.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {result.data.map((v) => <VisitCard key={v.id} visit={v} onEdit={() => { setEditing(v); setModalOpen(true); }} onStatusChange={statusChange} />)}
        </div>
      )}

      {layout === 'list' && result.data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['CUSTOMER', 'DATE', 'STAFF', 'COUNTER', 'CATEGORY', 'PURPOSE', 'STATUS', ''].map((h) => (
                  <th key={h || 'act'} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((v) => {
                const st = STATUS_STYLE[v.status];
                return (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900">{v.customer}</p><p className="text-xs text-gray-400">{v.phone}</p></td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{dmy(v.date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{v.staff || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{v.counter || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{v.category || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px] truncate">{v.purpose || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${st.bar}`}>{st.label}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditing(v); setModalOpen(true); }} className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-100">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={result.pages} total={result.total} limit={PAGE_SIZE} onPage={setPage} />

      <VisitModal open={modalOpen} initial={editing} lookups={lookups} onClose={() => setModalOpen(false)} onSaved={fetchData} />
    </div>
  );
}

function VisitCard({ visit, onEdit, onStatusChange }) {
  const st = STATUS_STYLE[visit.status];
  const Icon = st.icon;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 text-base font-bold flex items-center justify-center shrink-0">
            {(visit.customer[0] || '?').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{visit.customer}</p>
            <p className="text-[11px] text-gray-500">{visit.phone || 'No phone'}</p>
          </div>
        </div>
        <span className={`text-[9px] font-bold tracking-wide rounded-full px-2.5 py-0.5 border shrink-0 flex items-center gap-1 ${st.bar}`}>
          <Icon className="w-3 h-3" /> {st.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <InfoItem label="ASSIGNED STAFF" value={visit.staff || '—'} dot="bg-indigo-500" />
        <InfoItem label="LOCATION"       value={visit.visitLocation || 'Not Specified'} />
        <InfoItem label="CATEGORY"       value={visit.category || '—'} bold />
        <InfoItem label="COUNTER"        value={visit.counter  || '—'} />
      </div>

      {visit.purpose && (
        <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide truncate" title={visit.purpose}>{visit.purpose}</p>
      )}
      {visit.notes && (
        <p className="text-xs text-gray-500 italic line-clamp-1">{visit.notes}</p>
      )}

      <div className="flex gap-2 mt-1">
        {visit.status === 'IN_PROGRESS' && (
          <button onClick={() => onStatusChange(visit.id, 'COMPLETED')}
            className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 border border-emerald-200">
            Mark Complete
          </button>
        )}
        <button onClick={onEdit}
          className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-semibold hover:bg-gray-200">
          Edit
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value, dot, bold }) {
  return (
    <div>
      <p className="text-[9px] font-semibold text-gray-400 tracking-widest">{label}</p>
      <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
        {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
        {value}
      </p>
    </div>
  );
}

function VisitModal({ open, initial, lookups, onClose, onSaved }) {
  const { user } = useAuth();
  const TODAY_STR = new Date().toLocaleDateString('en-CA');
  const EMPTY = {
    contactId: '', visitDate: TODAY_STR, salutation: 'Mr', newVisitorName: '', newVisitorPhone: '',
    counter: '', category: '', userId: '', purpose: '', visitLocation: '', internalNotes: '', notes: '',
  };
  const [form, setForm]       = useState(EMPTY);
  const [contacts, setContacts] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [statusVal, setStatusVal] = useState('IN_PROGRESS');

  useEffect(() => {
    if (!open) return;
    setError('');
    setStatusVal(initial?.status || 'IN_PROGRESS');
    setForm(initial ? {
      contactId:       initial.contactId       || '',
      visitDate:       initial.date            || TODAY_STR,
      salutation:      'Mr',
      newVisitorName:  initial.newVisitorName  || '',
      newVisitorPhone: initial.newVisitorPhone || initial.phone || '',
      counter:         initial.counter         || '',
      category:        initial.category        || '',
      userId:          initial.staffId         || '',
      purpose:         initial.purpose         || '',
      visitLocation:   initial.visitLocation   || '',
      internalNotes:   initial.internalNotes   || '',
      notes:           initial.notes           || '',
    } : EMPTY);
    // Load contacts for the customer search dropdown
    api.get('/contacts', { params: { limit: 200 } }).then((r) => setContacts(r.data.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (initial) {
        await api.put(`/visits/${initial.id}`, { ...form, status: statusVal });
      } else {
        await api.post('/visits', form);
      }
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the visit');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={initial ? 'Edit Visit' : 'New Visit Log'} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[94vh] overflow-y-auto">

        <div className="px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{initial ? 'Edit Visit' : 'NEW VISIT LOG'}</h2>
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-0.5">MASTER DATA CONTROL</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <Field label="LINK EXISTING CUSTOMER">
              <select value={form.contactId} onChange={set('contactId')} className={INPUT}>
                <option value="">Search by Name or Phone</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </select>
            </Field>
            <Field label="VISIT DATE *">
              <input type="date" value={form.visitDate} onChange={set('visitDate')} required className={INPUT} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="NEW VISITOR NAME *">
              <div className="flex gap-2">
                <select value={form.salutation} onChange={set('salutation')} className={`${INPUT} w-24 shrink-0`}>
                  {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input value={form.newVisitorName} onChange={set('newVisitorName')} placeholder="Enter Full Name" className={`${INPUT} flex-1 min-w-0`} />
              </div>
            </Field>
            <Field label="NEW VISITOR PHONE *">
              <input value={form.newVisitorPhone} onChange={set('newVisitorPhone')} placeholder="Contact Number" className={INPUT} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="COUNTER *">
              <select value={form.counter} onChange={set('counter')} className={INPUT}>
                <option value="">Select Counter</option>
                {COUNTERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="REQUIREMENT CATEGORY *">
              <select value={form.category} onChange={set('category')} className={INPUT}>
                <option value="">Select Category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="ASSIGN TO SALES STAFF *">
              <select value={form.userId} onChange={set('userId')} className={INPUT} disabled={user?.role === 'SALES'}>
                <option value="">Select Staff</option>
                {(lookups.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="PURPOSE / DETAILS *">
              <input value={form.purpose} onChange={set('purpose')} placeholder="e.g. Bangles Purchase" className={INPUT} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="VISIT LOCATION">
              <input value={form.visitLocation} onChange={set('visitLocation')} placeholder="e.g. In-store, Home Visit, Client Office" className={INPUT} />
            </Field>
            <Field label="INTERNAL NOTES">
              <textarea rows={2} maxLength={1000} value={form.internalNotes} onChange={set('internalNotes')} placeholder="Customer preferences..." className={`${INPUT} resize-none`} />
            </Field>
          </div>

          {initial && (
            <Field label="STATUS">
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} className={INPUT}>
                {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button disabled={saving} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold disabled:opacity-60">
            <CheckCircle2 className="w-4 h-4" /> {saving ? 'Saving…' : initial ? 'Save Changes' : 'Save & Assign Visit'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5">{label}</label>{children}</div>;
}

const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white disabled:opacity-50';
