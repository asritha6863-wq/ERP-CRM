import { useState, useEffect, useCallback } from 'react';
import { Heart, Grid, List, Maximize2, Search, X, CheckCircle2, Clock, Calendar, User } from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';

const PAGE_SIZE = 20;
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const dmy = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—');

const STATUS_STYLE = {
  PENDING:   'text-amber-600 bg-amber-50 border-amber-200',
  ASSIGNED:  'text-blue-600 bg-blue-50 border-blue-200',
  COMPLETED: 'text-emerald-700 bg-emerald-50 border-emerald-200',
};
const STATUS_LABEL = { PENDING: 'Pending', ASSIGNED: 'Assigned', COMPLETED: 'Completed' };
const I = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';
const L = 'block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5';

export default function MarriagePurchasePage() {
  const { lookups } = useLookups();

  const [layout,  setLayout]  = useState('list');
  const [page,    setPage]    = useState(1);
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [summary, setSummary] = useState({ total: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState({ search: '', marriageFrom: '', marriageTo: '', status: '' });
  const [assigning, setAssigning] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { ...filters, page, limit: PAGE_SIZE };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const r = await api.get('/marriage-purchases', { params });
      setItems(Array.isArray(r.data?.data) ? r.data.data : []);
      setTotal(r.data?.total ?? 0);
      setPages(r.data?.pages ?? 1);
      setSummary(r.data?.summary ?? { total: 0, pending: 0, completed: 0 });
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load marriage purchases');
    } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setF = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  const assign = async (contactId, userId) => {
    try { await api.post(`/marriage-purchases/${contactId}/assign`, { userId }); fetchData(); }
    catch (e) { setError(e?.response?.data?.error || 'Could not assign attendee'); }
    setAssigning(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Marriage Purchases Board</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">Bridal CRM</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Track bridal jewelry clients and manage representative attendance</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="border border-gray-200 rounded-xl px-3 py-1.5 bg-white flex items-center gap-2">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL PURCHASES</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total}</p>
            </div>
            <Heart className="w-4 h-4 text-pink-300" />
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button onClick={() => setLayout('card')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${layout === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Grid className="w-3.5 h-3.5" /> Card</button>
            <button onClick={() => setLayout('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${layout === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><List className="w-3.5 h-3.5" /> Table</button>
          </div>
          <button className="p-2 rounded-lg border border-gray-200 text-gray-400"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SumCard label="Total Bridal Purchases" value={summary.total}     hint="Purchased customers"      icon={Heart}       iconClass="text-pink-400" />
        <SumCard label="Pending Actions"        value={summary.pending}   hint="Representatives to assign" icon={Clock}       iconClass="text-amber-400" valueClass="text-amber-600" />
        <SumCard label="Completed Attendance"   value={summary.completed} hint="Attended by company"       icon={CheckCircle2} iconClass="text-emerald-400" valueClass="text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className={L}>Search Customer / Invoice</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={filters.search} onChange={setF('search')} placeholder="Search by customer, contact, or invoice..." className={`${I} pl-9`} />
          </div>
        </div>
        <div>
          <label className={L}>Marriage From</label>
          <input type="date" value={filters.marriageFrom} onChange={setF('marriageFrom')} className={I} />
        </div>
        <div>
          <label className={L}>Marriage To</label>
          <input type="date" value={filters.marriageTo} onChange={setF('marriageTo')} className={I} />
        </div>
        <div>
          <label className={L}>Status</label>
          <select value={filters.status} onChange={setF('status')} className={I}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && items.length === 0 && <p className="text-sm text-gray-400">Loading…</p>}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center">
            <Heart className="w-6 h-6 text-pink-300" />
          </div>
          <p className="text-sm font-semibold text-gray-800">No Marriage Purchases Found</p>
          <p className="text-xs text-blue-500">No bridal clients matching the selected criteria</p>
        </div>
      )}

      {/* Table view */}
      {layout === 'list' && items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['CUSTOMER', 'INVOICE NUMBER', 'MARRIAGE DATE', 'AMOUNT', 'COMPANY ATTENDEE', 'STATUS', 'ACTIONS'].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-semibold text-gray-900">{r.customer}</p><p className="text-xs text-gray-400">{r.phone}</p></td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-700">{r.invoiceRef || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap"><span className={`flex items-center gap-1.5 ${!r.marriageDate ? 'text-gray-300' : ''}`}><Calendar className="w-3.5 h-3.5" />{dmy(r.marriageDate)}</span></td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-800">{r.amount > 0 ? inr(r.amount) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {r.attendee ? (
                      <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center">{r.attendee[0]}</span>{r.attendee}</span>
                    ) : <span className="text-gray-300">Not assigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${STATUS_STYLE[r.status] || STATUS_STYLE.PENDING}`}>{STATUS_LABEL[r.status] || r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setAssigning(r)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50">
                      {r.attendeeId ? 'Reassign' : 'Assign'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card view */}
      {layout === 'card' && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{r.customer}</p>
                  <p className="text-[11px] text-gray-500">{r.phone}</p>
                </div>
                <span className={`text-[9px] font-bold rounded-full px-2.5 py-0.5 border shrink-0 ${STATUS_STYLE[r.status] || STATUS_STYLE.PENDING}`}>{STATUS_LABEL[r.status]}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">MARRIAGE DATE</p><p className="text-gray-700 mt-0.5">{dmy(r.marriageDate)}</p></div>
                <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">INVOICE</p><p className="text-gray-700 mt-0.5 font-mono">{r.invoiceRef || '—'}</p></div>
                <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">AMOUNT</p><p className="font-semibold text-gray-900 mt-0.5">{r.amount > 0 ? inr(r.amount) : '—'}</p></div>
                <div><p className="text-[9px] font-semibold text-gray-400 tracking-widest">ATTENDEE</p><p className="text-gray-700 mt-0.5">{r.attendee || 'Not assigned'}</p></div>
              </div>
              <button onClick={() => setAssigning(r)} className="w-full py-1.5 rounded-lg bg-pink-50 text-pink-600 text-xs font-semibold hover:bg-pink-100 border border-pink-200">
                {r.attendeeId ? 'Reassign Attendee' : 'Assign Attendee'}
              </button>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">←</button>
            <span className="px-3 py-1.5">{page}/{pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">→</button>
          </div>
        </div>
      )}

      {/* Assign attendee modal */}
      {assigning && (
        <AssignModal contact={assigning} staff={lookups.staff || []} onClose={() => setAssigning(null)} onAssign={(userId) => assign(assigning.id, userId)} />
      )}
    </div>
  );
}

function AssignModal({ contact, staff, onClose, onAssign }) {
  const [userId, setUserId] = useState(contact.attendeeId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    await onAssign(userId);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Assign Company Attendee</h2>
            <p className="text-xs text-gray-400 mt-0.5">{contact.customer}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Representative</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="flex-1 py-2.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SumCard({ label, value, hint, icon: Icon, iconClass, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-4">
      <span className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
        <Icon className={`w-5 h-5 ${iconClass}`} />
      </span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-3xl font-bold font-mono mt-0.5 ${valueClass}`}>{Number(value).toLocaleString('en-IN')}</p>
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      </div>
    </div>
  );
}
