import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Star, CheckCircle2, X, Filter, Search, TrendingUp, Plus, Printer,
} from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';
import Pagination from '../../components/ui/Pagination.jsx';

const PAGE_SIZE = 10;
const EMPTY_FILTERS = { dateFrom: '', dateTo: '', rating: '', salesmanId: '', search: '' };
const BAR = { 5: 'bg-emerald-500', 4: 'bg-lime-500', 3: 'bg-orange-500', 2: 'bg-amber-500', 1: 'bg-red-500' };

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null));
const dmy   = (s) => (s ? s.split('-').reverse().join('/') : '');
const pct   = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

export default function FeedbackReportPage() {
  const { lookups } = useLookups();

  const [draft, setDraft]     = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage]       = useState(1);
  const [result, setResult]   = useState({ data: [], total: 0, pages: 1, summary: null });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [adding, setAdding]   = useState(false);
  const [viewing, setViewing] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/feedback', { params: { ...clean(applied), page, limit: PAGE_SIZE } });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load feedback');
    } finally { setLoading(false); }
  }, [applied, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const generate = (e) => { e?.preventDefault(); setApplied(draft); setPage(1); };
  const reset    = () => { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };

  const s     = result.summary;
  const total = s?.total ?? 0;
  const first = result.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last  = Math.min(page * PAGE_SIZE, result.total);

  return (
    <div className="space-y-5">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customer Feedback Report</h1>
          <p className="text-xs text-gray-400 mt-0.5">Ratings and comments collected from customers after purchase</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Printer className="w-3.5 h-3.5" /> Print Report
          </button>
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add Feedback
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={generate} className="bg-white border border-gray-200 rounded-2xl p-5 print:hidden">
        <p className="flex items-center gap-2 text-[11px] font-bold text-gray-500 tracking-widest mb-4">
          <Filter className="w-3.5 h-3.5" /> FILTER FEEDBACK CRITERIA
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Field label="FROM DATE"><input type="date" value={draft.dateFrom} onChange={setField('dateFrom')} className={INPUT} /></Field>
          <Field label="TO DATE"><input type="date" value={draft.dateTo} onChange={setField('dateTo')} className={INPUT} /></Field>
          <Field label="RATING FILTER">
            <select value={draft.rating} onChange={setField('rating')} className={INPUT}>
              <option value="">All Ratings</option>
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
            </select>
          </Field>
          <Field label="SALESMAN / STAFF">
            <select value={draft.salesmanId} onChange={setField('salesmanId')} className={INPUT}>
              <option value="">All Staff</option>
              {lookups.staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="SEARCH">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={draft.search} onChange={setField('search')} placeholder="Name, phone, invoice..." className={`${INPUT} pl-9`} />
            </div>
          </Field>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={reset} className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Reset Filters</button>
          <button type="submit" className="px-6 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold">Generate Report</button>
        </div>
      </form>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card label="TOTAL ENTRIES" value={total} hint="Collected Feedbacks" icon={MessageSquare} iconClass="text-blue-500" hintClass="text-blue-400" />
        <Card label="AVG RATING" value={s?.average == null ? '—' : s.average.toFixed(1)} suffix="/ 5.0" hint="Overall Score" icon={Star} iconClass="text-amber-400 fill-amber-400" valueClass="text-amber-600" hintClass="text-amber-600" />
        <Card label="POSITIVE RATIO" value={s?.positiveRatio == null ? '—' : `${Math.round(s.positiveRatio)}%`} hint="4 & 5 Star Ratings" icon={CheckCircle2} iconClass="text-emerald-500" valueClass="text-emerald-600" hintClass="text-emerald-600" />
        <Card label="5-STAR REVIEWS" value={s?.fiveStar ?? 0} hint="Excellent Ratings" icon={Star} iconClass="text-purple-500" valueClass="text-purple-600" hintClass="text-blue-400" />
        <Card label="LOW RATINGS" value={s?.lowRatings ?? 0} hint="1 & 2 Star Alerts" icon={X} iconClass="text-red-500" valueClass="text-red-600" hintClass="text-red-500" />
      </div>

      {/* Distribution */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-xs font-bold text-gray-700 tracking-widest mb-4">
          <TrendingUp className="w-4 h-4 text-indigo-500" /> RATING BREAKDOWN DISTRIBUTION
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(s?.distribution || [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 }))).map((d) => (
            <div key={d.rating} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-gray-800 flex items-center gap-1">{d.rating} <Star className="w-3 h-3 text-amber-400 fill-amber-400" /></span>
                <span className="font-mono text-gray-500">{d.count} ({pct(d.count, total)}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div className={`h-full rounded-full ${BAR[d.rating]}`} style={{ width: `${pct(d.count, total)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Records */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 tracking-wide">DETAILED FEEDBACK RECORDS</h2>
          <span className="text-[11px] font-semibold text-white bg-gray-900 rounded-full px-3 py-1">
            Showing {first} - {last} of {result.total.toLocaleString('en-IN')} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['#', 'COLLECTED DATE', 'CUSTOMER NAME', 'PHONE', 'REF / INVOICE NO', 'RATING', 'COMMENTS / FEEDBACK', 'SALESMAN SERVED', 'ACTION'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center text-gray-400 py-10">Loading…</td></tr>}
              {!loading && result.data.length === 0 && <tr><td colSpan={9} className="text-center text-gray-400 py-10">No feedback found</td></tr>}
              {!loading && result.data.map((r, i) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{dmy(r.date)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{r.customer}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.phone || <Dash />}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.invoiceRef || <Dash />}</td>
                  <td className="px-4 py-3"><RatingPill value={r.rating} /></td>
                  <td className="px-4 py-3 text-gray-600 max-w-[280px] truncate" title={r.comment}>{r.comment || <Dash />}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.salesman || <Dash />}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setViewing(r)} className="px-3 py-1 rounded-md bg-gray-900 hover:bg-gray-800 text-white text-[11px] font-semibold">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 print:hidden">
          <Pagination page={page} pages={result.pages} total={result.total} limit={PAGE_SIZE} onPage={setPage} />
        </div>
      </section>

      <AddFeedbackModal open={adding} staff={lookups.staff} onClose={() => setAdding(false)} onSaved={() => { setPage(1); fetchData(); }} />
      <ViewModal item={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function RatingPill({ value }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {value}
    </span>
  );
}

function ViewModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [item, onClose]);
  if (!item) return null;
  return (
    <Overlay onClose={onClose} title="Feedback Details">
      <dl className="space-y-3 text-sm">
        <Row k="Customer" v={item.customer} />
        <Row k="Phone" v={item.phone || '—'} />
        <Row k="Invoice" v={item.invoiceRef || '—'} />
        <Row k="Collected" v={dmy(item.date)} />
        <Row k="Salesman served" v={item.salesman || '—'} />
        <div className="flex items-center justify-between"><dt className="text-gray-500">Rating</dt><dd><RatingPill value={item.rating} /></dd></div>
      </dl>
      <p className="text-[11px] font-semibold text-gray-400 tracking-widest mt-5 mb-1.5">COMMENT</p>
      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-3 whitespace-pre-wrap">{item.comment || 'No comment left.'}</p>
    </Overlay>
  );
}

function AddFeedbackModal({ open, staff, onClose, onSaved }) {
  const EMPTY = { lead: null, rating: 0, comment: '', invoiceRef: '', salesmanId: '' };
  const [form, setForm]       = useState(EMPTY);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { if (open) { setForm(EMPTY); setQuery(''); setResults([]); setError(''); } /* eslint-disable-next-line */ }, [open]);

  // Debounced customer lookup
  useEffect(() => {
    if (!open || form.lead || query.trim().length < 2) { setResults([]); return undefined; }
    const t = setTimeout(() => {
      api.get('/leads', { params: { search: query.trim(), limit: 8 } })
        .then((r) => setResults(r.data.data || []))
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query, open, form.lead]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.lead) return setError('Select the customer this feedback is for');
    if (!form.rating) return setError('Choose a rating from 1 to 5');
    setSaving(true); setError('');
    try {
      await api.post('/feedback', {
        leadId: form.lead.id, rating: form.rating, comment: form.comment,
        invoiceRef: form.invoiceRef, salesmanId: form.salesmanId || undefined,
      });
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the feedback');
    } finally { setSaving(false); }
  };

  return (
    <Overlay onClose={onClose} title="Add Feedback">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>CUSTOMER *</Label>
          {form.lead ? (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
              <span>{form.lead.firstName} {form.lead.lastName}{form.lead.phone ? ` · ${form.lead.phone}` : ''}</span>
              <button type="button" onClick={() => setForm((f) => ({ ...f, lead: null }))} className="text-xs text-gray-500 hover:text-red-600">Change</button>
            </div>
          ) : (
            <div className="relative">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or phone…" className={INPUT} autoFocus />
              {results.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {results.map((l) => (
                    <li key={l.id}>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, lead: l, salesmanId: f.salesmanId || l.assignedToId || '' }))}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        {l.firstName} {l.lastName}<span className="text-gray-400"> · {l.phone || 'no phone'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>RATING *</Label>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={form.rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setForm((f) => ({ ...f, rating: n }))} className="p-1">
                <Star className={`w-7 h-7 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>INVOICE / REF NO</Label>
            <input value={form.invoiceRef} onChange={(e) => setForm((f) => ({ ...f, invoiceRef: e.target.value }))} placeholder="Auto from won deal" className={INPUT} />
          </div>
          <div>
            <Label>SALESMAN SERVED</Label>
            <select value={form.salesmanId} onChange={(e) => setForm((f) => ({ ...f, salesmanId: e.target.value }))} className={INPUT}>
              <option value="">Lead's assignee</option>
              {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label>COMMENT</Label>
          <textarea value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} rows={3} maxLength={1000} placeholder="What did the customer say?" className={`${INPUT} resize-none`} />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button disabled={saving} className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save Feedback'}</button>
        </div>
      </form>
    </Overlay>
  );
}

function Overlay({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-gray-900 text-right">{v}</dd></div>;
}

function Card({ label, value, suffix, hint, icon: Icon, iconClass, valueClass = 'text-gray-900', hintClass }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold text-gray-500 tracking-widest">{label}</p>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>
      <p className={`text-3xl font-bold mt-2 ${valueClass}`}>
        {value}{suffix && <span className="text-sm font-normal text-gray-400 ml-1.5">{suffix}</span>}
      </p>
      <p className={`text-[11px] mt-1 ${hintClass}`}>{hint}</p>
    </div>
  );
}

function Label({ children }) { return <label className="block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5">{children}</label>; }
function Field({ label, children }) { return <div><Label>{label}</Label>{children}</div>; }
function Dash() { return <span className="text-gray-300">—</span>; }

const INPUT = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400';
