import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Maximize2, User, List, Grid, Search, X, CheckCircle2, Clock, XCircle, Pencil } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useLookups from '../../hooks/useLookups.js';

const PAGE_SIZE = 12;
const TODAY = (() => { try { return new Date().toLocaleDateString('en-CA'); } catch { return ''; } })();

const SALUTATIONS = ['Mr', 'Mrs', 'Ms', 'Dr'];
const CATEGORIES  = ['Gold', 'Diamond', 'Silver', 'Platinum', 'Other'];
const COUNTERS    = ['Gold', 'Diamond', 'Silver', 'Platinum', 'Necklace', 'Bangle', 'Earing', 'Ring', 'Other'];

const STATUS_LABEL = { IN_PROGRESS: 'IN PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' };
const STATUS_BAR   = {
  IN_PROGRESS: 'text-pink-600 bg-pink-50 border-pink-200',
  COMPLETED:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  CANCELLED:   'text-gray-500 bg-gray-100 border-gray-200',
};
const safeStatus = (s) => STATUS_BAR[s] ? s : 'IN_PROGRESS';

const dmy  = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—');
const L = 'block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5';
const I = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white disabled:opacity-50';

export default function VisitManagementPage() {
  const { user }    = useAuth();
  const { lookups } = useLookups();

  const [view,    setView]    = useState('');
  const [layout,  setLayout]  = useState('card');
  const [page,    setPage]    = useState(1);
  const [visits,  setVisits]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState({ dateFrom: TODAY, dateTo: TODAY, userId: '', status: '', counter: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { ...filters, view, page, limit: PAGE_SIZE };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const r = await api.get('/visits', { params });
      setVisits(Array.isArray(r.data?.data) ? r.data.data : []);
      setTotal(r.data?.total  ?? 0);
      setPages(r.data?.pages  ?? 1);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [filters, view, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setF  = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const reset = () => { setFilters({ dateFrom: TODAY, dateTo: TODAY, userId: '', status: '', counter: '', search: '' }); setPage(1); };

  const markComplete = async (id) => {
    try { await api.put(`/visits/${id}`, { status: 'COMPLETED' }); fetchData(); }
    catch (e) { setError(e?.response?.data?.error || 'Could not update'); }
  };

  return (
    <div className="p-0 space-y-5">
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
          <div className="border border-gray-200 rounded-xl px-3 py-1.5 bg-white flex items-center gap-2">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL VISITS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total.toLocaleString('en-IN')}</p>
            </div>
            <MapPin className="w-4 h-4 text-gray-300" />
          </div>
          <button className="p-2 rounded-lg border border-gray-200 text-gray-400"><Maximize2 className="w-4 h-4" /></button>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button onClick={() => setLayout('card')} className={`p-1.5 rounded-md ${layout === 'card' ? 'bg-gray-100' : 'text-gray-400'}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setLayout('list')} className={`p-1.5 rounded-md ${layout === 'list' ? 'bg-gray-100' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
          </div>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> New Visit
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {[['', 'All Visits'], ['created', 'My Created Visits'], ['assigned', 'My Assigned Visits']].map(([id, label]) => (
          <button key={id} onClick={() => { setView(id); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium ${view === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {id !== '' && <User className="w-3.5 h-3.5" />} {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className={L}>Date Range</label>
          <div className="flex items-center gap-2">
            <input type="date" value={filters.dateFrom} onChange={setF('dateFrom')} className={I} />
            <input type="date" value={filters.dateTo}   onChange={setF('dateTo')}   className={I} />
          </div>
        </div>
        <div>
          <label className={L}>Staff</label>
          <select value={filters.userId} onChange={setF('userId')} className={I}>
            <option value="">All Staff</option>
            {(lookups.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={L}>Status</label>
          <select value={filters.status} onChange={setF('status')} className={I}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={L}>Counter</label>
          <select value={filters.counter} onChange={setF('counter')} className={I}>
            <option value="">All Counters</option>
            {COUNTERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={L}>Search Customer</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={filters.search} onChange={setF('search')} placeholder="Name or phone..." className={`${I} pl-9 w-44`} />
          </div>
        </div>
        <button onClick={reset} className="mb-0.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Reset</button>
      </div>

      {error   && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && visits.length === 0 && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && visits.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-16 bg-white border border-gray-200 rounded-2xl">No visits found. Log the first one with + New Visit.</p>
      )}

      {/* Card view */}
      {layout === 'card' && visits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visits.map((v) => {
            const ss = safeStatus(v.status);
            return (
              <div key={v.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 text-base font-bold flex items-center justify-center shrink-0">
                      {(v.customer?.[0] || '?').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{v.customer || 'Unknown'}</p>
                      <p className="text-[11px] text-gray-500">{v.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold tracking-wide rounded-full px-2.5 py-0.5 border shrink-0 ${STATUS_BAR[ss]}`}>
                    {STATUS_LABEL[ss]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">ASSIGNED STAFF</p><p className="text-gray-700 mt-0.5">{v.staff || '—'}</p></div>
                  <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">LOCATION</p><p className="text-gray-700 mt-0.5">{v.visitLocation || 'Not Specified'}</p></div>
                  <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">CATEGORY</p><p className="font-bold text-gray-900 mt-0.5">{v.category || '—'}</p></div>
                  <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">COUNTER</p><p className="text-gray-700 mt-0.5">{v.counter || '—'}</p></div>
                </div>

                {v.purpose && <p className="text-[11px] font-semibold text-gray-800 uppercase tracking-wide truncate">{v.purpose}</p>}
                {v.notes   && <p className="text-xs text-gray-500 italic line-clamp-1">{v.notes}</p>}

                <div className="flex gap-2 mt-1">
                  {ss === 'IN_PROGRESS' && (
                    <button onClick={() => markComplete(v.id)}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 border border-emerald-200">
                      Mark Complete
                    </button>
                  )}
                  <button onClick={() => { setEditing(v); setModalOpen(true); }}
                    className="flex-1 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-semibold hover:bg-gray-200">
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {layout === 'list' && visits.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['CUSTOMER', 'DATE', 'STAFF', 'COUNTER', 'CATEGORY', 'PURPOSE', 'STATUS', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => {
                const ss = safeStatus(v.status);
                return (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900">{v.customer}</p><p className="text-xs text-gray-400">{v.phone}</p></td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{dmy(v.date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{v.staff || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{v.counter || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">{v.category || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 max-w-[200px] truncate">{v.purpose || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${STATUS_BAR[ss]}`}>{STATUS_LABEL[ss]}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setEditing(v); setModalOpen(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">←</button>
            <span className="px-3 py-1.5">{page} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">→</button>
          </div>
        </div>
      )}

      {modalOpen && (
        <VisitModal initial={editing} lookups={lookups} user={user}
          onClose={() => { setModalOpen(false); setEditing(null); }} onSaved={fetchData} />
      )}
    </div>
  );
}

function VisitModal({ initial, lookups, user, onClose, onSaved }) {
  const TODAY_STR = (() => { try { return new Date().toLocaleDateString('en-CA'); } catch { return ''; } })();
  const EMPTY = { contactId: '', visitDate: TODAY_STR, salutation: 'Mr', newVisitorName: '', newVisitorPhone: '', counter: '', category: '', userId: '', purpose: '', visitLocation: '', internalNotes: '', notes: '' };
  const [form, setForm]       = useState(() => initial ? {
    contactId: initial.contactId || '', visitDate: initial.date || TODAY_STR, salutation: 'Mr',
    newVisitorName: initial.newVisitorName || '', newVisitorPhone: initial.newVisitorPhone || initial.phone || '',
    counter: initial.counter || '', category: initial.category || '', userId: initial.staffId || '',
    purpose: initial.purpose || '', visitLocation: initial.visitLocation || '',
    internalNotes: initial.internalNotes || '', notes: initial.notes || '',
  } : EMPTY);
  const [contacts, setContacts] = useState([]);
  const [statusVal, setStatusVal] = useState(initial?.status || 'IN_PROGRESS');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/contacts', { params: { limit: 200 } }).then((r) => setContacts(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (initial) await api.put(`/visits/${initial.id}`, { ...form, status: statusVal });
      else         await api.post('/visits', form);
      onSaved(); onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save the visit');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[94vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{initial ? 'Edit Visit' : 'NEW VISIT LOG'}</h2>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-0.5">MASTER DATA CONTROL</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={L}>LINK EXISTING CUSTOMER</label>
              <select value={form.contactId} onChange={set('contactId')} className={I}>
                <option value="">Search by Name or Phone</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? ` · ${c.phone}` : ''}</option>)}
              </select></div>
            <div><label className={L}>VISIT DATE *</label>
              <input type="date" value={form.visitDate} onChange={set('visitDate')} required className={I} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={L}>NEW VISITOR NAME *</label>
              <div className="flex gap-2">
                <select value={form.salutation} onChange={set('salutation')} className={`${I} w-24 shrink-0`}>
                  {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input value={form.newVisitorName} onChange={set('newVisitorName')} placeholder="Enter Full Name" className={`${I} flex-1 min-w-0`} />
              </div></div>
            <div><label className={L}>NEW VISITOR PHONE *</label>
              <input value={form.newVisitorPhone} onChange={set('newVisitorPhone')} placeholder="Contact Number" className={I} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={L}>COUNTER *</label>
              <select value={form.counter} onChange={set('counter')} className={I}>
                <option value="">Select Counter</option>
                {COUNTERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className={L}>REQUIREMENT CATEGORY *</label>
              <select value={form.category} onChange={set('category')} className={I}>
                <option value="">Select Category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={L}>ASSIGN TO SALES STAFF *</label>
              <select value={form.userId} onChange={set('userId')} className={I} disabled={user?.role === 'SALES'}>
                <option value="">Select Staff</option>
                {(lookups.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div><label className={L}>PURPOSE / DETAILS *</label>
              <input value={form.purpose} onChange={set('purpose')} placeholder="e.g. Bangles Purchase" className={I} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={L}>VISIT LOCATION</label>
              <input value={form.visitLocation} onChange={set('visitLocation')} placeholder="e.g. In-store" className={I} /></div>
            <div><label className={L}>INTERNAL NOTES</label>
              <textarea rows={2} value={form.internalNotes} onChange={set('internalNotes')} placeholder="Customer preferences..." className={`${I} resize-none`} /></div>
          </div>
          {initial && (
            <div><label className={L}>STATUS</label>
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} className={I}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
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
