import { useState, useEffect, useCallback } from 'react';
import { Filter, Search, MapPin } from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';
import Pagination from '../../components/ui/Pagination.jsx';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

const PAGE_SIZE = 20;
const iso = (d) => d.toLocaleDateString('en-CA');
const defaultFilters = () => ({
  search: '', createdFrom: iso(new Date(Date.now() - 60 * 86_400_000)), createdTo: iso(new Date()),
  createdById: '', assignedToId: '', status: '', stageId: '', sourceId: '', channel: '',
});
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));
const dmy   = (s) => (s ? s.split('-').reverse().join('/') : '');
const inr   = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const STATUS_STYLE = {
  PENDING:   'text-blue-600 bg-blue-50 border-blue-200',
  WON:       'text-emerald-700 bg-emerald-50 border-emerald-200',
  LOST:      'text-red-600 bg-red-50 border-red-200',
  CANCELLED: 'text-gray-500 bg-gray-100 border-gray-200',
};

export default function IncentiveReportPage() {
  const { lookups } = useLookups();
  const { globalParams } = useGlobalFilter();

  const [view, setView]       = useState('lead');
  const [draft, setDraft]     = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [page, setPage]       = useState(1);
  const [result, setResult]   = useState({ data: [], total: 0, pages: 1, summary: null });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {
        ...(globalParams.branchId ? { branchId: globalParams.branchId } : {}),
        ...clean(applied), view, page, limit: PAGE_SIZE,
      };
      setResult((await api.get('/reports/incentive', { params })).data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load the incentive report');
    } finally { setLoading(false); }
  }, [applied, view, page, globalParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const apply = (e) => { e?.preventDefault(); setApplied(draft); setPage(1); };
  const clear = () => { const d = defaultFilters(); setDraft(d); setApplied(d); setPage(1); };
  const switchView = (v) => { setView(v); setPage(1); };

  const s = result.summary;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Incentive Report</h1>
        <p className="text-xs text-gray-400 mt-0.5">Expected amount against actual revenue, by lead or by customer</p>
      </div>

      {/* Filters */}
      <form onSubmit={apply} className="bg-white border border-gray-200 rounded-2xl p-5 print:hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <p className="flex items-center gap-2 text-[11px] font-bold text-gray-600 tracking-widest">
            <Filter className="w-3.5 h-3.5 text-amber-500" /> INCENTIVE REPORT FILTERS
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">View Mode:</span>
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              {[['lead', 'Lead View'], ['customer', 'Customer View']].map(([id, label]) => (
                <button type="button" key={id} onClick={() => switchView(id)} aria-pressed={view === id}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${view === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-white'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Field label="Customer / Phone Search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={draft.search} onChange={setField('search')} placeholder="Search customer, phone..." className={`${INPUT} pl-9`} />
            </div>
          </Field>
          <Field label="Created From Date"><input type="date" value={draft.createdFrom} onChange={setField('createdFrom')} className={INPUT} /></Field>
          <Field label="Created To Date"><input type="date" value={draft.createdTo} onChange={setField('createdTo')} className={INPUT} /></Field>
          <Field label="Created By / Owner">
            <Select value={draft.createdById} onChange={setField('createdById')} all="All Owners / Creators" options={lookups.staff.map((u) => [u.id, u.name])} />
          </Field>
          <Field label="Assigned To">
            <Select value={draft.assignedToId} onChange={setField('assignedToId')} all="All Assigned Employees" options={lookups.staff.map((u) => [u.id, u.name])} />
          </Field>

          <Field label="Status">
            <Select value={draft.status} onChange={setField('status')} all="All Statuses"
              options={[['PENDING', 'Pending'], ['WON', 'Won'], ['LOST', 'Lost'], ['CANCELLED', 'Cancelled']]} />
          </Field>
          <Field label="Stage">
            <Select value={draft.stageId} onChange={setField('stageId')} all="All Stages" options={lookups.stages.map((x) => [x.id, x.name])} />
          </Field>
          <Field label="Lead Source">
            <Select value={draft.sourceId} onChange={setField('sourceId')} all="All Sources" options={lookups.sources.map((x) => [x.id, x.name])} />
          </Field>
          <Field label="Channel">
            <Select value={draft.channel} onChange={setField('channel')} all="All Channels" options={[['OUTDOOR', 'Outdoor'], ['INSTORE', 'Instore']]} />
          </Field>
          <div className="flex items-end gap-3">
            <button type="submit" className="flex-1 px-6 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold">Apply</button>
            <button type="button" onClick={clear} className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Clear</button>
          </div>
        </div>
      </form>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Tile label="LEADS" value={(s?.leads ?? 0).toLocaleString('en-IN')} />
        <Tile label="EXPECTED AMOUNT" value={inr(s?.expected)} valueClass="text-gray-900" />
        <Tile label="ACTUAL REVENUE" value={inr(s?.revenue)} valueClass="text-emerald-600" />
      </div>

      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {view === 'lead' ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {['CUSTOMER / DATE', 'CREATED BY / OWNER', 'ASSIGNED TO', 'STAGE & STATUS', 'SOURCE & CHANNEL', 'EXPECTED AMOUNT', 'ACTUAL REVENUE', 'MULTI-LEAD TAG'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} className="text-center text-gray-400 py-12">Loading…</td></tr>}
                {!loading && result.data.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-12">No leads match these filters</td></tr>}
                {!loading && result.data.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/70 align-top">
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-gray-900">{r.customer}</p>
                      <p className="text-[11px] text-gray-500 font-mono">{r.phone || '—'}</p>
                      {r.area && <p className="flex items-center gap-1 text-[11px] text-rose-400"><MapPin className="w-3 h-3" /> {r.area}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">Lead #{r.leadNo} • Created: {dmy(r.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4"><Person name={r.owner} sub="Owner Employee" dot="bg-indigo-500" nameClass="text-gray-900" /></td>
                    <td className="px-4 py-4"><Person name={r.assignedTo} sub="Assigned Staff" dot="bg-purple-500" nameClass="text-purple-600" /></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.stage && <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-0.5">{r.stage}</span>}
                        <span className={`text-[10px] font-bold rounded px-2 py-0.5 border ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-800">{r.source || '—'}</p>
                      <p className="text-[10px] text-gray-400">Channel: {r.channel}</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-gray-800">{r.expectedAmount == null ? <span className="text-gray-300">–</span> : inr(r.expectedAmount)}</td>
                    <td className="px-4 py-4 font-mono text-sm text-emerald-600">{r.actualRevenue == null ? <span className="text-gray-300">–</span> : inr(r.actualRevenue)}</td>
                    <td className="px-4 py-4 text-[11px]">
                      {r.customerLeads > 1
                        ? <span className="font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded px-2 py-0.5">Multi Lead ({r.customerLeads})</span>
                        : <span className="text-gray-400">Single Lead</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {['CUSTOMER', 'PHONE', 'LEADS', 'WON', 'LOST', 'EXPECTED AMOUNT', 'ACTUAL REVENUE'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="text-center text-gray-400 py-12">Loading…</td></tr>}
                {!loading && result.data.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-12">No customers match these filters</td></tr>}
                {!loading && result.data.map((r) => (
                  <tr key={r.contactId} className="border-b border-gray-100 hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-semibold text-gray-900">{r.customer}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.phone || '—'}</td>
                    <td className="px-4 py-3 font-mono">{r.leads}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600">{r.won}</td>
                    <td className="px-4 py-3 font-mono text-red-500">{r.lost}</td>
                    <td className="px-4 py-3 font-mono">{inr(r.expectedAmount)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600">{inr(r.actualRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {view === 'lead' ? (
          <div className="px-4 py-3 border-t border-gray-100 print:hidden">
            <Pagination page={page} pages={result.pages} total={result.total} limit={PAGE_SIZE} onPage={setPage} />
          </div>
        ) : (
          <p className="px-4 py-3 border-t border-gray-100 text-[11px] text-gray-400">Top 100 customers by number of leads, under the current filters</p>
        )}
      </section>
    </div>
  );
}

function Person({ name, sub, dot, nameClass }) {
  if (!name) return <span className="text-gray-300">—</span>;
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-sm font-semibold ${nameClass}`}><span className={`w-2 h-2 rounded-full ${dot}`} /> {name}</p>
      <p className="text-[10px] text-gray-400 ml-3.5">{sub}</p>
    </div>
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
function Field({ label, children }) {
  return <div><label className="block text-[11px] font-medium text-gray-600 mb-1.5">{label}</label>{children}</div>;
}
function Select({ value, onChange, all, options }) {
  return (
    <select value={value} onChange={onChange} className={INPUT}>
      <option value="">{all}</option>
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}
const INPUT = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400';
