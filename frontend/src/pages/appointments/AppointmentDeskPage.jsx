import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Plus, Maximize2, List, CalendarDays, Search, X, CheckCircle2 } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useLookups from '../../hooks/useLookups.js';

const PAGE_SIZE = 20;

const APPT_TYPES = ['Gold Purchase', 'Diamond Purchase', 'Silver Purchase', 'Exchange', 'Repair', 'Custom Order', 'Enquiry', 'Other'];

const STATUS_LABEL = { SCHEDULED: 'SCHEDULED', CONFIRMED: 'CONFIRMED', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED', NO_SHOW: 'NO SHOW' };
const STATUS_BAR   = {
  SCHEDULED:  'text-blue-600 bg-blue-50 border-blue-200',
  CONFIRMED:  'text-indigo-600 bg-indigo-50 border-indigo-200',
  COMPLETED:  'text-emerald-700 bg-emerald-50 border-emerald-200',
  CANCELLED:  'text-gray-500 bg-gray-100 border-gray-200',
  NO_SHOW:    'text-red-600 bg-red-50 border-red-200',
};

const dmy = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—');
const L   = 'block text-[10px] font-semibold text-gray-600 tracking-widest mb-1.5 uppercase';
const I   = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white disabled:opacity-50';

export default function AppointmentDeskPage() {
  const { user }    = useAuth();
  const { lookups } = useLookups();

  const [layout,  setLayout]  = useState('list');
  const [page,    setPage]    = useState(1);
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState({ branchId: '', advisorId: '', status: '', dateFrom: '', dateTo: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { ...filters, page, limit: PAGE_SIZE };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const r = await api.get('/appointments', { params });
      setItems(Array.isArray(r.data?.data) ? r.data.data : []);
      setTotal(r.data?.total ?? 0);
      setPages(r.data?.pages ?? 1);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load appointments');
    } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setF = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Showroom Appointment Desk</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">Appointments</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Coordinate visits, assign advisors, and track customer showroom engagement</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="border border-gray-200 rounded-xl px-3 py-1.5 bg-white flex items-center gap-2">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL BOOKINGS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total}</p>
            </div>
            <CalendarCheck className="w-4 h-4 text-gray-300" />
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button onClick={() => setLayout('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${layout === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><List className="w-3.5 h-3.5" /> List View</button>
            <button onClick={() => setLayout('grid')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${layout === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><CalendarDays className="w-3.5 h-3.5" /> Calendar Grid</button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-500"><Maximize2 className="w-3.5 h-3.5" /> Analytics</button>
          </div>
          <button className="p-2 rounded-lg border border-gray-200 text-gray-400"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        {user?.role === 'ADMIN' && (
          <div>
            <label className={L}>Select Branch</label>
            <select value={filters.branchId} onChange={setF('branchId')} className={I}>
              <option value="">All Branches</option>
              {(lookups.branches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={L}>Assigned Advisor</label>
          <select value={filters.advisorId} onChange={setF('advisorId')} className={I}>
            <option value="">All Salespersons</option>
            {(lookups.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={L}>Booking Status</label>
          <select value={filters.status} onChange={setF('status')} className={I}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={L}>Visit Date From</label>
          <input type="date" value={filters.dateFrom} onChange={setF('dateFrom')} className={I} />
        </div>
        <div>
          <label className={L}>Visit Date To</label>
          <input type="date" value={filters.dateTo} onChange={setF('dateTo')} className={I} />
        </div>
        <div>
          <label className={L}>Search Customer</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={filters.search} onChange={setF('search')} placeholder="Name or phone number..." className={`${I} pl-9 w-52`} />
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800">No Appointments Found</p>
          <p className="text-xs text-blue-500">There are no visits matching your current filters. Clear filters or add a new manual booking.</p>
        </div>
      )}

      {/* List View */}
      {layout === 'list' && items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['CUSTOMER', 'BRANCH', 'TYPE', 'DATE', 'ADVISOR', 'STATUS', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center text-gray-400 py-10">Loading…</td></tr>}
              {items.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-semibold text-gray-900">{a.customer}</p><p className="text-xs text-gray-400">{a.phone}</p></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{a.branch || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{a.appointmentType || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{dmy(a.date)}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{a.advisor || 'Auto-Assign'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${STATUS_BAR[a.status] || STATUS_BAR.SCHEDULED}`}>
                      {STATUS_LABEL[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditing(a); setModalOpen(true); }} className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-100">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
              <span>{Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">←</button>
                <span className="px-3 py-1.5">{page}/{pages}</span>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Grid View */}
      {layout === 'grid' && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{a.customer}</p>
                  <p className="text-[11px] text-gray-500">{a.phone || 'No phone'}</p>
                </div>
                <span className={`text-[9px] font-bold rounded-full px-2.5 py-0.5 border shrink-0 ${STATUS_BAR[a.status] || STATUS_BAR.SCHEDULED}`}>
                  {STATUS_LABEL[a.status] || a.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">DATE</p><p className="text-gray-700 mt-0.5">{dmy(a.date)}</p></div>
                <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">TYPE</p><p className="text-gray-700 mt-0.5">{a.appointmentType || '—'}</p></div>
                <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">ADVISOR</p><p className="text-gray-700 mt-0.5">{a.advisor || 'Auto-Assign'}</p></div>
                <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">BRANCH</p><p className="text-gray-700 mt-0.5">{a.branch || '—'}</p></div>
              </div>
              {a.notes && <p className="text-xs text-gray-500 italic line-clamp-2">{a.notes}</p>}
              <button onClick={() => { setEditing(a); setModalOpen(true); }} className="w-full py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200">Edit</button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <BookingModal initial={editing} lookups={lookups} user={user}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={() => { setModalOpen(false); setEditing(null); fetchData(); }} />
      )}
    </div>
  );
}

function BookingModal({ initial, lookups, user, onClose, onSaved }) {
  const TODAY = (() => { try { return new Date().toLocaleDateString('en-CA'); } catch { return ''; } })();
  const EMPTY = { contactId: '', newCustomerName: '', newCustomerPhone: '', branchId: '', appointmentType: '', appointmentDate: TODAY, advisorId: '', notes: '' };

  const [form,     setForm]     = useState(() => initial ? {
    contactId: initial.contactId || '', newCustomerName: '', newCustomerPhone: initial.phone || '',
    branchId: initial.branchId || '', appointmentType: initial.appointmentType || '',
    appointmentDate: initial.date || TODAY, advisorId: initial.advisorId || '', notes: initial.notes || '',
  } : EMPTY);
  const [contacts,   setContacts]   = useState([]);
  const [statusVal,  setStatusVal]  = useState(initial?.status || 'SCHEDULED');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [cSearch,    setCSearch]    = useState('');
  const [cResults,   setCResults]   = useState([]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Live customer search
  useEffect(() => {
    if (!cSearch.trim() || form.contactId) { setCResults([]); return; }
    const t = setTimeout(() => {
      api.get('/contacts', { params: { search: cSearch.trim(), limit: 8 } })
        .then((r) => setCResults(r.data?.data || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [cSearch, form.contactId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickContact = (c) => {
    setForm((f) => ({ ...f, contactId: c.id, newCustomerPhone: c.phone || '' }));
    setCSearch(`${c.firstName} ${c.lastName}`.trim());
    setCResults([]);
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (initial) await api.put(`/appointments/${initial.id}`, { ...form, status: statusVal });
      else         await api.post('/appointments', form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save appointment');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[94vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-gray-800" />
              <h2 className="text-base font-bold text-gray-900 uppercase">{initial ? 'Edit Appointment' : 'New Appointment Booking'}</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">

          {/* Customer search */}
          <div>
            <label className={L}>Select Customer *</label>
            <div className="relative">
              <input value={form.contactId ? (cSearch || 'Customer selected') : cSearch} onChange={(e) => { setCSearch(e.target.value); if (form.contactId) setForm((f) => ({ ...f, contactId: '' })); }}
                placeholder="Search customer by name or phone..." className={I} />
              {form.contactId && (
                <button type="button" onClick={() => { setForm((f) => ({ ...f, contactId: '' })); setCSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              )}
              {cResults.length > 0 && !form.contactId && (
                <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {cResults.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => pickContact(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        {c.firstName} {c.lastName}<span className="text-gray-400"> · {c.phone || 'no phone'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={L}>Showroom Branch *</label>
              <select value={form.branchId} onChange={set('branchId')} className={I}>
                <option value="">Select branch...</option>
                {(lookups.branches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className={L}>Appointment Type *</label>
              <select value={form.appointmentType} onChange={set('appointmentType')} className={I}>
                <option value="">Select purpose...</option>
                {APPT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={L}>Select Date *</label>
              <input type="date" value={form.appointmentDate} onChange={set('appointmentDate')} required className={I} />
            </div>
            <div>
              <label className={L}>Preferred Sales Advisor (Optional)</label>
              <select value={form.advisorId} onChange={set('advisorId')} className={I} disabled={user?.role === 'SALES'}>
                <option value="">Auto-Assign (Showroom default)</option>
                {(lookups.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {!form.contactId && (
            <div>
              <label className={L}>New Customer Phone</label>
              <input value={form.newCustomerPhone} onChange={set('newCustomerPhone')} placeholder="Contact number" className={I} />
            </div>
          )}

          <div>
            <label className={L}>Requirement Notes</label>
            <textarea rows={3} maxLength={1000} value={form.notes} onChange={set('notes')}
              placeholder="Add any specific ornaments customer wants to view..." className={`${I} resize-none`} />
          </div>

          {initial && (
            <div>
              <label className={L}>Status</label>
              <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)} className={I}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="py-3 rounded-xl border-2 border-gray-200 text-sm font-bold uppercase text-gray-600 hover:bg-gray-50 tracking-widest">
              Cancel
            </button>
            <button disabled={saving}
              className="py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {saving ? 'Saving…' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
