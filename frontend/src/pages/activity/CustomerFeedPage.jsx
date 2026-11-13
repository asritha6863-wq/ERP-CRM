import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Search, BarChart3, Maximize2, Phone, Calendar, Clock,
  LayoutGrid, List, Star, X, PhoneOff,
} from 'lucide-react';
import api from '../../services/api.js';
import Pagination from '../../components/ui/Pagination.jsx';

const PAGE_SIZE = 12;
const KIND_STYLE = {
  REGISTRATION: 'text-blue-600 bg-blue-50 border-blue-200',
  PURCHASE:     'text-emerald-700 bg-emerald-50 border-emerald-200',
};
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB');
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
// Keep only digits and a leading + so the tel: link is always a clean number
const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

export default function CustomerFeedPage() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState('PENDING');
  const [layout, setLayout] = useState('grid');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]     = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [calling, setCalling] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { status: tab, search: search.trim(), dateFrom, dateTo, page, limit: PAGE_SIZE };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      setResult((await api.get('/feedback-requests', { params })).data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load the feedback queue');
    } finally { setLoading(false); }
  }, [tab, search, dateFrom, dateTo, page]);

  // Debounce so typing in search doesn't fire a request per keystroke
  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);

  const switchTab = (t) => { setTab(t); setPage(1); };
  const isPending = tab === 'PENDING';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Customer Feedback</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">Voice of Customer</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Real-time purchase insights, satisfaction ratings &amp; callback logs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL ENTRIES</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{result.total.toLocaleString('en-IN')}</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><MessageSquare className="w-3.5 h-3.5 text-gray-500" /></span>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} aria-label="From date" className="text-xs text-gray-700 focus:outline-none" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} aria-label="To date" className="text-xs text-gray-700 focus:outline-none" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search feedback..." aria-label="Search feedback"
              className="pl-9 pr-3 py-2 w-52 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
          <button onClick={() => navigate('/reports/customer-feedback')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold">
            <BarChart3 className="w-3.5 h-3.5" /> Feedback Report
          </button>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Tabs + layout toggle */}
      <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2.5 flex items-center justify-between">
        <div className="flex rounded-lg bg-gray-100 p-0.5" role="tablist">
          {[['PENDING', 'Pending Feed'], ['COMPLETED', 'Feedback History']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => switchTab(id)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-gray-200 p-0.5">
          {[['grid', LayoutGrid, 'Grid view'], ['list', List, 'List view']].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setLayout(id)} aria-label={label} aria-pressed={layout === id}
              className={`p-1.5 rounded-md ${layout === id ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && result.data.length === 0 && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && result.data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-16 bg-white border border-gray-200 rounded-2xl">
          {isPending ? 'No pending feedback calls. New registrations and purchases will appear here.' : 'No completed feedback calls yet.'}
        </p>
      )}

      {layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {result.data.map((r) => <FeedCard key={r.id} r={r} pending={isPending} onCall={() => setCalling(r)} />)}
        </div>
      ) : result.data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['CUSTOMER', 'PHONE', 'TYPE', 'REF NO.', isPending ? 'QUEUED' : 'COMPLETED', isPending ? 'ATTEMPTS' : 'RATING', ''].map((h) => (
                  <th key={h || 'act'} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.customer}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.phone || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold rounded px-2 py-0.5 border ${KIND_STYLE[r.kind]}`}>{r.kind}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-700">{r.refNo}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(isPending ? r.createdAt : r.completedAt)}</td>
                  <td className="px-4 py-3 text-xs">{isPending ? r.attempts : <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r.rating}</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {isPending && <button onClick={() => setCalling(r)} className="px-3 py-1 rounded-md bg-pink-500 hover:bg-pink-600 text-white text-[11px] font-semibold">Call</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={result.pages} total={result.total} limit={PAGE_SIZE} onPage={setPage} />

      <CallModal request={calling} onClose={() => setCalling(null)} onDone={fetchData} />
    </div>
  );
}

function FeedCard({ r, pending, onCall }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 text-base font-bold flex items-center justify-center shrink-0">
            {(r.customer[0] || '?').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{r.customer}</p>
            <p className="flex items-center gap-1 text-[11px] text-gray-500"><Phone className="w-3 h-3" /> {r.phone || 'No phone'}</p>
          </div>
        </div>
        <span className={`text-[9px] font-bold tracking-wide rounded-full px-2.5 py-0.5 border shrink-0 ${KIND_STYLE[r.kind]}`}>{r.kind}</span>
      </div>

      <div className="flex items-start justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-semibold text-gray-400 tracking-widest">REF NO.</p>
          <p className="text-xs font-bold text-gray-900 truncate">{r.refNo}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-semibold text-gray-400 tracking-widest">STATUS</p>
          {pending
            ? <p className="text-xs font-semibold text-blue-600">{r.attempts > 0 ? `Tried ${r.attempts}×` : 'Active'}</p>
            : <p className="flex items-center justify-end gap-1 text-xs font-semibold text-amber-600"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r.rating}/5</p>}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {fmtDate(pending ? r.createdAt : r.completedAt)}</span>
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {fmtTime(pending ? r.createdAt : r.completedAt)}</span>
      </div>

      {pending ? (
        <>
          {r.lastAttemptNote && <p className="text-[11px] italic text-gray-500 -mt-1">Last try: {r.lastAttemptNote}</p>}
          <button onClick={onCall} className="flex items-center justify-center gap-2 w-full rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold tracking-widest uppercase py-2.5 transition-colors">
            <Phone className="w-3.5 h-3.5" /> Launch Feedback Call
          </button>
        </>
      ) : (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">
          {r.comment || 'No comment left.'}<span className="block text-[10px] text-gray-400 mt-1">Called by {r.completedBy || '—'}</span>
        </p>
      )}
    </div>
  );
}

function CallModal({ request, onClose, onDone }) {
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [note, setNote]       = useState('');
  const [mode, setMode]       = useState('answered');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { if (request) { setRating(0); setComment(''); setNote(''); setMode('answered'); setError(''); } }, [request]);
  useEffect(() => {
    if (!request) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request, onClose]);
  if (!request) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'answered' && !rating) return setError('Choose a rating from 1 to 5');
    setSaving(true);
    try {
      if (mode === 'answered') await api.post(`/feedback-requests/${request.id}/complete`, { rating, comment });
      else await api.post(`/feedback-requests/${request.id}/attempt`, { note });
      onDone(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the call');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Feedback call" className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{request.customer}</h2>
            <p className="text-xs text-gray-400">{request.kind === 'PURCHASE' ? 'Purchase' : 'Registration'} feedback · {request.refNo}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {request.phone ? (
            <a href={telHref(request.phone)} className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-pink-200 bg-pink-50 text-pink-600 text-sm font-bold py-3 hover:bg-pink-100">
              <Phone className="w-4 h-4" /> Call {request.phone}
            </a>
          ) : <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">No phone number on this lead.</p>}

          <div className="grid grid-cols-2 gap-2">
            {[['answered', 'Customer answered', Star], ['missed', 'No answer / call later', PhoneOff]].map(([id, label, Icon]) => (
              <button type="button" key={id} onClick={() => setMode(id)} aria-pressed={mode === id}
                className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-xs font-semibold ${mode === id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {mode === 'answered' ? (
            <>
              <div>
                <span className="block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5">RATING *</span>
                <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="p-1">
                      <Star className={`w-8 h-8 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5">WHAT DID THEY SAY?</span>
                <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Customer comments…" className={INPUT} />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5">NOTE</span>
              <input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Switched off, call after 5pm" className={INPUT} />
              <span className="block text-[11px] text-gray-400 mt-1.5">The call stays in the pending feed.</span>
            </label>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : mode === 'answered' ? 'Save Feedback' : 'Log Attempt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white resize-none';
