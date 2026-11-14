import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Users, Clock, CheckCircle2, XCircle, DollarSign, RefreshCw, Maximize2,
  Printer, Download, Filter, Search,
} from 'lucide-react';
import api from '../../services/api.js';
import { downloadCsvResponseAsExcel } from '../../utils/excel.js';
import useLookups from '../../hooks/useLookups.js';
import Pagination from '../../components/ui/Pagination.jsx';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

const PAGE_SIZE = 10;

// Columns exported to CSV (keys are defined by the backend report service)
const EXPORT_COLUMNS = [
  'name', 'phone', 'area', 'assignedTo', 'marriageDate', 'dnf', 'createdAt',
  'status', 'stage', 'expectedAmount', 'purchaseAmount', 'source',
];

const STATUS_STYLE = {
  PENDING:   'text-blue-600 bg-blue-50 border-blue-200',
  WON:       'text-emerald-700 bg-emerald-50 border-emerald-200',
  LOST:      'text-red-600 bg-red-50 border-red-200',
  CANCELLED: 'text-gray-500 bg-gray-100 border-gray-200',
};

const iso = (d) => d.toLocaleDateString('en-CA');
const defaultFilters = () => {
  const to = new Date();
  const from = new Date(Date.now() - 60 * 86_400_000);   // last 60 days, like the reference design
  return { createdFrom: iso(from), createdTo: iso(to), assignedToId: '', status: '', stageId: '', channel: '', sourceId: '', search: '' };
};
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null));
const dmy   = (s) => (s ? s.split('-').reverse().join('/') : '');
const money = (v) => (v === '' || v == null ? '' : `₹${Number(v).toLocaleString('en-IN')}`);

export default function BdeReportPage() {
  const { lookups }      = useLookups();
  const { globalParams } = useGlobalFilter();

  const [draft, setDraft]     = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [page, setPage]       = useState(1);
  const [summary, setSummary] = useState(null);
  const [rows, setRows]       = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [exporting, setExporting] = useState(false);

  const queryParams = useCallback(
    () => ({ ...(globalParams.branchId ? { branchId: globalParams.branchId } : {}), ...clean(applied) }),
    [applied, globalParams],
  );

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = queryParams();
      const [s, list] = await Promise.all([
        api.get('/reports/leads/summary', { params }),
        api.get('/reports/leads', { params: { ...params, page, limit: PAGE_SIZE } }),
      ]);
      setSummary(s.data);
      setRows(list.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load the BDE report');
    } finally { setLoading(false); }
  }, [queryParams, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setField = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const generate = (e) => { e?.preventDefault(); setApplied(draft); setPage(1); };
  const reset    = () => { const d = defaultFilters(); setDraft(d); setApplied(d); setPage(1); };

  const exportCsv = async () => {
    setExporting(true); setError('');
    try {
      const res = await api.get('/reports/leads/export', {
        params: { ...queryParams(), columns: EXPORT_COLUMNS.join(',') },
        responseType: 'blob',
      });
      await downloadCsvResponseAsExcel(res.data, 'bde-lead-report.xlsx');
    } catch { setError('Excel export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  const t = summary?.totals;
  const total = t?.total ?? 0;
  const first = rows.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last  = Math.min(page * PAGE_SIZE, rows.total);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">BDE-wise Lead Report</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">BDE Analytics</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Filter and analyze CRM leads assigned to BDEs and staff</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL LEADS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total.toLocaleString('en-IN')}</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-gray-500" /></span>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Printer className="w-3.5 h-3.5" /> Print Report
          </button>
          <button onClick={exportCsv} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold disabled:opacity-60">
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={generate} className="bg-white border border-gray-200 rounded-2xl p-5 print:hidden">
        <p className="flex items-center gap-2 text-[11px] font-bold text-gray-500 tracking-widest mb-4">
          <Filter className="w-3.5 h-3.5" /> FILTER REPORT CRITERIA
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <Field label="CREATED FROM"><input type="date" value={draft.createdFrom} onChange={setField('createdFrom')} className={INPUT} /></Field>
          <Field label="CREATED TO"><input type="date" value={draft.createdTo} onChange={setField('createdTo')} className={INPUT} /></Field>
          <Field label="ASSIGNED TO / BDE">
            <Select value={draft.assignedToId} onChange={setField('assignedToId')} all="All BDEs / Staff" options={lookups.staff.map((s) => [s.id, s.name])} />
          </Field>
          <Field label="STATUS">
            <Select value={draft.status} onChange={setField('status')} all="All Statuses"
              options={[['PENDING', 'Pending'], ['WON', 'Won'], ['LOST', 'Lost'], ['CANCELLED', 'Cancelled']]} />
          </Field>
          <Field label="STAGE">
            <Select value={draft.stageId} onChange={setField('stageId')} all="All Stages" options={lookups.stages.map((s) => [s.id, s.name])} />
          </Field>
          <Field label="CHANNEL">
            <Select value={draft.channel} onChange={setField('channel')} all="All Channels" options={[['OUTDOOR', 'Outdoor'], ['INSTORE', 'Instore']]} />
          </Field>
        </div>

        <div className="flex items-end justify-between gap-4 flex-wrap mt-4">
          <div className="flex items-end gap-4 flex-1 min-w-[280px] flex-wrap">
            <div className="w-full sm:w-52">
              <Field label="LEAD SOURCE">
                <Select value={draft.sourceId} onChange={setField('sourceId')} all="All Sources" options={lookups.sources.map((s) => [s.id, s.name])} />
              </Field>
            </div>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={draft.search} onChange={setField('search')} placeholder="Search name, phone, or area..."
                className={`${INPUT} pl-9`} aria-label="Search name, phone, or area" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={reset} className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Reset Filters</button>
            <button type="submit" className="px-6 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold">Generate Report</button>
          </div>
        </div>
      </form>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card label="TOTAL LEADS" value={total.toLocaleString('en-IN')} hint="Total BDE filtered leads" icon={Users} iconClass="text-indigo-400" />
        <Card label="PENDING" value={(t?.pending ?? 0).toLocaleString('en-IN')} hint="Active pending leads" icon={Clock} iconClass="text-amber-500" valueClass="text-amber-600" />
        <Card label="WON / COMPLETED" value={(t?.won ?? 0).toLocaleString('en-IN')} hint="Successfully closed" icon={CheckCircle2} iconClass="text-emerald-500" valueClass="text-emerald-600" />
        <Card label="LOST" value={((t?.lost ?? 0) + (t?.cancelled ?? 0)).toLocaleString('en-IN')} hint="Unconverted leads" icon={XCircle} iconClass="text-red-500" valueClass="text-red-600" />
        <Card label="EXP. VALUE" value={`₹ ${Math.round(t?.expectedValue ?? 0).toLocaleString('en-IN')}`} hint="Total expected value" icon={DollarSign} iconClass="text-purple-500" valueClass="text-purple-600" />
      </div>

      {/* Table */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 tracking-wide">DETAILED BDE LEADS LIST</h2>
          <span className="text-[11px] font-semibold text-white bg-gray-900 rounded-full px-3 py-1">
            Showing {first} - {last} of {rows.total.toLocaleString('en-IN')} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['#', 'NAME', 'MOBILE', 'AREA', 'ASSIGNED TO', 'WEDDING DATE', 'DNF', 'CREATED ON', 'STATUS', 'STAGE', 'EXP. AMOUNT', 'PURCHASE AMOUNT', 'LEAD SOURCE'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={13} className="text-center text-gray-400 py-10">Loading…</td></tr>}
              {!loading && rows.data.length === 0 && <tr><td colSpan={13} className="text-center text-gray-400 py-10">No leads match these filters</td></tr>}
              {!loading && rows.data.map((r, i) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.phone || <Dash />}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.area || <Dash />}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.assignedTo || <Dash />}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{dmy(r.marriageDate) || <Dash />}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold rounded px-2 py-0.5 border ${r.dnf === 'Yes' ? 'text-orange-600 bg-orange-50 border-orange-200' : 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                      {r.dnf === 'Yes' ? 'YES' : 'NO'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{dmy(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {r.stage ? <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-0.5 uppercase whitespace-nowrap">{r.stage}</span> : <Dash />}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">{money(r.expectedAmount) || <Dash />}</td>
                  <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">{money(r.purchaseAmount) || <Dash />}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.source || <Dash />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 print:hidden">
          <Pagination page={page} pages={rows.pages} total={rows.total} limit={PAGE_SIZE} onPage={setPage} />
        </div>
      </section>
    </div>
  );
}

function Dash() { return <span className="text-gray-300">—</span>; }

function Card({ label, value, hint, icon: Icon, iconClass, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold text-gray-500 tracking-widest">{label}</p>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>
      <p className={`text-3xl font-bold mt-2 break-all ${valueClass}`}>{value}</p>
      <p className="text-[11px] text-blue-400 mt-1">{hint}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
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

