import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, Maximize2, Grid, List, Search, X, Phone, Mail, MessageCircle, Radio, Users, Activity } from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';

const PAGE_SIZE = 12;
const TODAY = (() => { try { return new Date().toLocaleDateString('en-CA'); } catch { return ''; } })();

const CHANNELS = ['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'IN_PERSON', 'OTHER'];
const CHANNEL_ICON = {
  CALL:      Phone,
  WHATSAPP:  MessageCircle,
  EMAIL:     Mail,
  SMS:       Radio,
  IN_PERSON: Users,
  OTHER:     Activity,
};
const CHANNEL_COLOR = {
  CALL:      'bg-blue-50 text-blue-600 border-blue-200',
  WHATSAPP:  'bg-green-50 text-green-600 border-green-200',
  EMAIL:     'bg-orange-50 text-orange-600 border-orange-200',
  SMS:       'bg-purple-50 text-purple-600 border-purple-200',
  IN_PERSON: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  OTHER:     'bg-gray-50 text-gray-500 border-gray-200',
};

const dmy = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '—');
const L   = 'block text-[10px] font-semibold text-gray-600 tracking-widest mb-1.5 uppercase';
const I   = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';

export default function InteractionLogsPage() {
  const { lookups } = useLookups();

  const [layout,  setLayout]  = useState('card');
  const [page,    setPage]    = useState(1);
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [filters, setFilters] = useState({ dateFrom: TODAY, dateTo: TODAY, channel: '', search: '' });
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { ...filters, page, limit: PAGE_SIZE };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const r = await api.get('/interaction-logs', { params });
      setItems(Array.isArray(r.data?.data) ? r.data.data : []);
      setTotal(r.data?.total ?? 0);
      setPages(r.data?.pages ?? 1);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load interaction logs');
    } finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setF = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const reset = () => { setFilters({ dateFrom: TODAY, dateTo: TODAY, channel: '', search: '' }); setPage(1); };

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
              <h1 className="text-xl font-bold text-gray-900">Interaction History Logs</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">Touchpoints</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Comprehensive omni-channel customer communication diary &amp; activity timeline</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="border border-gray-200 rounded-xl px-3 py-1.5 bg-white flex items-center gap-2">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL LOGS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total}</p>
            </div>
            <MessageSquare className="w-4 h-4 text-gray-300" />
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button onClick={() => setLayout('card')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${layout === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><Grid className="w-3.5 h-3.5" /> Card</button>
            <button onClick={() => setLayout('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${layout === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}><List className="w-3.5 h-3.5" /> Table</button>
          </div>
          <button className="p-2 rounded-lg border border-gray-200 text-gray-400"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Log Interaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className={L}>Search Notes / Customer</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={filters.search} onChange={setF('search')} placeholder="Search keywords..." className={`${I} pl-9`} />
          </div>
        </div>
        <div>
          <label className={L}>From Date</label>
          <input type="date" value={filters.dateFrom} onChange={setF('dateFrom')} className={I} />
        </div>
        <div>
          <label className={L}>To Date</label>
          <input type="date" value={filters.dateTo} onChange={setF('dateTo')} className={I} />
        </div>
        <div>
          <label className={L}>Channel Type</label>
          <select value={filters.channel} onChange={setF('channel')} className={I}>
            <option value="">All Types</option>
            {CHANNELS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
        <button onClick={reset} className="mb-0.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Reset</button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && items.length === 0 && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-16 bg-white border border-gray-200 rounded-2xl">No interactions found. Log the first one with + Log Interaction.</p>
      )}

      {/* Card view */}
      {layout === 'card' && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => {
            const Icon  = CHANNEL_ICON[item.channel]  || Activity;
            const color = CHANNEL_COLOR[item.channel] || CHANNEL_COLOR.OTHER;
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate uppercase">{item.customer}</p>
                      <p className="text-[10px] font-bold tracking-widest text-gray-400">{item.channel.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{item.notes}</p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
                  <div>
                    <p className="text-[9px] font-semibold text-gray-400 tracking-widest">STAFF</p>
                    <p className="font-bold text-gray-900 mt-0.5">{item.staff || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-gray-400 tracking-widest">TIMESTAMP</p>
                    <p className="font-bold text-gray-900 mt-0.5">{dmy(item.loggedAt)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-2 flex items-center justify-center">
                  <span className="text-blue-500 text-xs font-medium">
                    <Activity className="w-3.5 h-3.5 inline-block mr-1" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table view */}
      {layout === 'list' && items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['CUSTOMER', 'CHANNEL', 'NOTES', 'STAFF', 'DATE'].map((h, i) => (
                  <th key={i} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const Icon  = CHANNEL_ICON[item.channel]  || Activity;
                const color = CHANNEL_COLOR[item.channel] || CHANNEL_COLOR.OTHER;
                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{item.customer}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${color}`}>
                        <Icon className="w-3 h-3" /> {item.channel.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[280px] truncate">{item.notes}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{item.staff || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{dmy(item.loggedAt)}</td>
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
            <span className="px-3 py-1.5">{page}/{pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50">→</button>
          </div>
        </div>
      )}

      {modalOpen && (
        <LogModal lookups={lookups} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); fetchData(); }} />
      )}
    </div>
  );
}

function LogModal({ lookups, onClose, onSaved }) {
  const [form,     setForm]     = useState({ contactId: '', leadId: '', channel: 'CALL', loggedById: '', notes: '' });
  const [contacts, setContacts] = useState([]);
  const [leads,    setLeads]    = useState([]);
  const [cSearch,  setCSearch]  = useState('');
  const [cResults, setCResults] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

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

  const pickContact = (c) => {
    setForm((f) => ({ ...f, contactId: c.id, leadId: '' }));
    setCSearch(`${c.firstName} ${c.lastName}`.trim());
    setCResults([]);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/interaction-logs', form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save interaction');
    } finally { setSaving(false); }
  };

  const SelIcon = CHANNEL_ICON[form.channel] || Activity;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[94vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Log Interaction</h2>
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-0.5">RECORD A NEW COMMUNICATION TOUCHPOINT</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">

          {/* Customer search */}
          <div>
            <label className={L}>Customer</label>
            <div className="relative">
              <input value={form.contactId ? (cSearch || 'Customer selected') : cSearch}
                onChange={(e) => { setCSearch(e.target.value); if (form.contactId) setForm((f) => ({ ...f, contactId: '' })); }}
                placeholder="Select Customer"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              {form.contactId && (
                <button type="button" onClick={() => { setForm((f) => ({ ...f, contactId: '' })); setCSearch(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              )}
              {cResults.length > 0 && !form.contactId && (
                <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                  {cResults.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => pickContact(c)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
                        {c.firstName} {c.lastName}<span className="text-gray-400"> · {c.phone || 'no phone'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Channel + Logged By */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={L}>Channel</label>
              <select value={form.channel} onChange={set('channel')} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                {CHANNELS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={L}>Logged By</label>
              <select value={form.loggedById} onChange={set('loggedById')} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                <option value="">Select Staff</option>
                {(lookups.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={L}>Interaction Notes</label>
            <textarea rows={5} maxLength={2000} value={form.notes} onChange={set('notes')}
              placeholder="Add details about the conversation..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <button disabled={saving}
            className="w-full py-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold tracking-[0.2em] uppercase disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Interaction Log'}
          </button>
        </form>
      </div>
    </div>
  );
}
