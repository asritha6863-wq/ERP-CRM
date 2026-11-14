import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3, Users, UserPlus, CheckCircle2, XCircle, MapPin, Maximize2, RefreshCw, Download, ChevronDown, Columns3 } from 'lucide-react';
import api from '../../services/api.js';
import { downloadCsvResponseAsExcel } from '../../utils/excel.js';
import useLookups from '../../hooks/useLookups.js';
import Pagination from '../../components/ui/Pagination.jsx';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

const PAGE_SIZE = 20;

const ALL_COLUMNS = [
  { key: 'date',          label: 'Visit Date'            },
  { key: 'customer',      label: 'Customer / Visitor'    },
  { key: 'phone',         label: 'Phone'                 },
  { key: 'staff',         label: 'Staff'                 },
  { key: 'counter',       label: 'Counter'               },
  { key: 'category',      label: 'Requirement Category'  },
  { key: 'purpose',       label: 'Purpose / Details'     },
  { key: 'visitLocation', label: 'Visit Location'        },
  { key: 'displayStatus', label: 'Status'                },
  { key: 'internalNotes', label: 'Internal Notes'        },
];
const DEFAULT_COLS = ALL_COLUMNS.map((c) => c.key);

const STATUS_STYLE = {
  IN_PROGRESS: 'text-blue-600 bg-blue-50 border-blue-200',
  COMPLETED:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  CONVERTED:   'text-teal-700 bg-teal-50 border-teal-200',
  CANCELLED:   'text-gray-500 bg-gray-100 border-gray-200',
  LOST:        'text-red-600 bg-red-50 border-red-200',
};

const dmy  = (s) => (s ? s.split('-').reverse().join('/') : '—');
const inr  = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

const COUNTERS_STATIC = ['Gold', 'Diamond', 'Silver', 'Platinum', 'Necklace', 'Bangle', 'Earing', 'Ring', 'Other'];
const CATEGORIES_STATIC = ['Gold', 'Diamond', 'Silver', 'Platinum', 'Other'];

export default function VisitReportPage() {
  const { lookups } = useLookups();
  const { globalParams } = useGlobalFilter();

  const [viewTab,   setViewTab]   = useState('all');      // all | insights
  const [page,      setPage]      = useState(1);
  const [columns,   setColumns]   = useState(DEFAULT_COLS);
  const [colsOpen,  setColsOpen]  = useState(false);
  const colsRef = useRef(null);

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', userId: '', counter: '', category: '', status: '' });
  const [search,  setSearch]  = useState('');

  const [summary,  setSummary]  = useState(null);
  const [rows,     setRows]     = useState({ data: [], total: 0, pages: 1 });
  const [insights, setInsights] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [exporting, setExporting] = useState(false);

  const queryParams = useCallback(
    () => ({ ...clean(filters), search: search.trim(), ...(globalParams.branchId ? { branchId: globalParams.branchId } : {}) }),
    [filters, search, globalParams],
  );

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = queryParams();
      const [s, list] = await Promise.all([
        api.get('/visits/summary', { params }),
        viewTab === 'all'
          ? api.get('/visits', { params: { ...params, page, limit: PAGE_SIZE } })
          : api.get('/customer-hub', { params: { ...params, limit: 50 } }),
      ]);
      setSummary(s.data);
      if (viewTab === 'all') setRows(list.data);
      else setInsights(list.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load visit report');
    } finally { setLoading(false); }
  }, [queryParams, viewTab, page]);

  useEffect(() => { const t = setTimeout(fetchData, 300); return () => clearTimeout(t); }, [fetchData]);

  // Close column picker on outside click
  useEffect(() => {
    const close = (e) => { if (colsRef.current && !colsRef.current.contains(e.target)) setColsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const setFilter = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const reset = () => { setFilters({ dateFrom: '', dateTo: '', userId: '', counter: '', category: '', status: '' }); setSearch(''); setPage(1); };

  const toggleColumn = (key) =>
    setColumns((cols) => {
      if (cols.includes(key)) return cols.length === 1 ? cols : cols.filter((c) => c !== key);
      return ALL_COLUMNS.map((c) => c.key).filter((k) => cols.includes(k) || k === key);
    });

  const exportCsv = async () => {
    setExporting(true); setError('');
    try {
      const res = await api.get('/visits/export', { params: queryParams(), responseType: 'blob' });
      await downloadCsvResponseAsExcel(res.data, 'visit-report.xlsx');
    } catch { setError('Excel export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  const s = summary;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Visit Reports</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">Store Footfall</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Analyze store visits, customer insights and sales staff performance</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL VISITS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{(s?.total ?? 0).toLocaleString('en-IN')}</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><MapPin className="w-3.5 h-3.5 text-gray-500" /></span>
          </div>

          {/* View tabs */}
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <TabBtn active={viewTab === 'all'}      onClick={() => { setViewTab('all');      setPage(1); }}>All Visits</TabBtn>
            <TabBtn active={viewTab === 'insights'} onClick={() => { setViewTab('insights'); setPage(1); }}>Customer Insights</TabBtn>
          </div>

          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold disabled:opacity-60">
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card label="TOTAL VISITS"      value={s?.total          ?? 0} icon={BarChart3}    iconClass="text-indigo-500" />
        <Card label="UNIQUE CUSTOMERS"  value={s?.uniqueCustomers ?? 0} icon={Users}        iconClass="text-blue-500" />
        <Card label="NEW VISITORS"      value={s?.newVisitors     ?? 0} icon={UserPlus}     iconClass="text-amber-500" valueClass="text-amber-600" />
        <Card label="CONVERTED"         value={s?.converted       ?? 0} icon={CheckCircle2} iconClass="text-emerald-500" valueClass="text-emerald-600" />
        <Card label="LOST"              value={s?.lost            ?? 0} icon={XCircle}      iconClass="text-red-500" valueClass="text-red-600" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3 print:hidden">
        <FilterField label="Date Range">
          <div className="flex items-center gap-2">
            <input type="date" value={filters.dateFrom} onChange={setFilter('dateFrom')} className={INPUT} />
            <input type="date" value={filters.dateTo}   onChange={setFilter('dateTo')}   className={INPUT} />
          </div>
        </FilterField>
        <FilterField label="Staff">
          <select value={filters.userId} onChange={setFilter('userId')} className={INPUT}>
            <option value="">All Staff</option>
            {lookups.staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Counter">
          <select value={filters.counter} onChange={setFilter('counter')} className={INPUT}>
            <option value="">All Counters</option>
            {COUNTERS_STATIC.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FilterField>
        <FilterField label="Category">
          <select value={filters.category} onChange={setFilter('category')} className={INPUT}>
            <option value="">All Categories</option>
            {CATEGORIES_STATIC.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select value={filters.status} onChange={setFilter('status')} className={INPUT}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_STYLE).map(([k]) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
          </select>
        </FilterField>
        <FilterField label="Search">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name or phone..." className={`${INPUT} w-44`} />
        </FilterField>
        <button onClick={reset} className="mb-0.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Reset</button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* Table */}
      {viewTab === 'all' && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <MapPin className="w-4 h-4 text-indigo-500" /> All Visits
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-md px-2 py-0.5">
                {rows.total.toLocaleString('en-IN')} TOTAL
              </span>
            </h2>
            <div className="flex items-center gap-2 print:hidden">
              <span className="text-[10px] font-semibold text-gray-400 tracking-wide">SELECT REPORT COLUMNS:</span>
              <div className="relative" ref={colsRef}>
                <button onClick={() => setColsOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50">
                  <Columns3 className="w-3.5 h-3.5" /> All Columns Selected <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {colsOpen && (
                  <div className="absolute right-0 mt-1 z-20 w-56 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2">
                    {ALL_COLUMNS.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={columns.includes(c.key)} onChange={() => toggleColumn(c.key)} className="accent-pink-500" />
                        {c.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active columns chips */}
          <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-gray-50/50 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 tracking-widest mr-1">ACTIVE COLUMNS ({columns.length}):</span>
            {columns.map((k) => {
              const col = ALL_COLUMNS.find((c) => c.key === k);
              return col ? (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" /> {col.label}
                </span>
              ) : null;
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3">#</th>
                  {columns.map((k) => (
                    <th key={k} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">
                      {ALL_COLUMNS.find((c) => c.key === k)?.label.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={columns.length + 1} className="text-center text-gray-400 py-10">Loading…</td></tr>}
                {!loading && rows.data.length === 0 && <tr><td colSpan={columns.length + 1} className="text-center text-gray-400 py-10">No visits match these filters</td></tr>}
                {!loading && rows.data.map((v, i) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    {columns.map((k) => (
                      <td key={k} className="px-4 py-3 whitespace-nowrap">
                        {k === 'displayStatus' ? (
                          <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${STATUS_STYLE[v[k]] || STATUS_STYLE.IN_PROGRESS}`}>
                            {String(v[k]).replace('_', ' ')}
                          </span>
                        ) : k === 'customer' ? (
                          <span className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                              {(v[k]?.[0] || '?').toUpperCase()}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">{v[k]}</span>
                          </span>
                        ) : k === 'date' ? (
                          <span className="text-xs text-gray-600">{dmy(v[k])}</span>
                        ) : (
                          <span className="text-xs text-gray-700">{v[k] || <span className="text-gray-300">—</span>}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 print:hidden">
            <Pagination page={page} pages={rows.pages} total={rows.total} limit={PAGE_SIZE} onPage={setPage} />
          </div>
        </section>
      )}

      {viewTab === 'insights' && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Top 50 customers by visits</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['CUSTOMER', 'PHONE', 'TOTAL VISITS', 'PURCHASES', 'LIFETIME VALUE', 'LAST VISIT'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center text-gray-400 py-10">Loading…</td></tr>}
              {!loading && insights.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-10">No customers found</td></tr>}
              {!loading && insights.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{c.phone || '—'}</td>
                  <td className="px-4 py-3 font-mono text-indigo-600">{c.visits}</td>
                  <td className="px-4 py-3 font-mono text-emerald-600">{c.purchases}</td>
                  <td className="px-4 py-3 font-mono text-gray-800">{inr(c.lifetimeValue)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{dmy(c.lastVisit) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
      {children}
    </button>
  );
}

function Card({ label, value, icon: Icon, iconClass, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold text-gray-500 tracking-widest">{label}</p>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>
      <p className={`text-3xl font-bold mt-2 font-mono ${valueClass}`}>{Number(value).toLocaleString('en-IN')}</p>
    </div>
  );
}

function FilterField({ label, children }) {
  return <div><label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>{children}</div>;
}

const INPUT = 'rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400';

