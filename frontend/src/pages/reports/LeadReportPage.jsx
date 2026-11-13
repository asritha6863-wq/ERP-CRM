import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Users, Check, X, Activity, TrendingUp, Columns3, Maximize2, Printer, Download,
  Briefcase, AlertCircle, ListX, Clock, ChevronDown, Table2, XCircle, CheckCircle2,
} from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';
import Pagination from '../../components/ui/Pagination.jsx';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

// Keys match the backend column catalogue used for the table and the CSV export
const COLUMNS = [
  { key: 'name',           label: 'Customer'            },
  { key: 'phone',          label: 'Phone'               },
  { key: 'branch',         label: 'Branch'              },
  { key: 'source',         label: 'Lead Source'         },
  { key: 'channel',        label: 'Channel'             },
  { key: 'stage',          label: 'Stage'               },
  { key: 'status',         label: 'Status'              },
  { key: 'leadStatus',     label: 'Lead Status'         },
  { key: 'priority',       label: 'Priority'            },
  { key: 'createdAt',      label: 'Created'             },
  { key: 'dueDate',        label: 'Due Date'            },
  { key: 'marriageDate',   label: 'Marriage Date'       },
  { key: 'owner',          label: 'Owner'               },
  { key: 'assignedTo',     label: 'Assigned To'         },
  { key: 'expectedWeight', label: 'Expected Weight (g)' },
  { key: 'expectedAmount', label: 'Expected Amount'     },
  { key: 'dnf',            label: 'Date Not Fixed'      },
  { key: 'lossReason',     label: 'Loss Reason'         },
  { key: 'area',           label: 'Area'                },
  { key: 'purchaseDate',   label: 'Purchase Date'       },
];
const DEFAULT_COLUMNS = ['name', 'phone', 'branch', 'source', 'stage', 'status', 'priority', 'createdAt', 'dueDate', 'assignedTo'];

// Instore report: same keys, walk-in wording, 14 columns on by default
const INSTORE_LABELS = {
  name: 'Lead Name', phone: 'Contact Number', area: 'Contact / Area', createdAt: 'Created Date',
  assignedTo: 'Assigned Employee / Owner',
};
const INSTORE_COLUMNS = COLUMNS.map((c) => ({ ...c, label: INSTORE_LABELS[c.key] || c.label }));
const INSTORE_DEFAULT = [
  'name', 'phone', 'area', 'branch', 'source', 'channel', 'stage', 'status',
  'leadStatus', 'priority', 'createdAt', 'dueDate', 'assignedTo', 'purchaseDate',
];

const EMPTY_FILTERS = {
  name: '', phone: '', marriageFrom: '', marriageTo: '', createdFrom: '', createdTo: '',
  stageId: '', status: '', sourceId: '', createdById: '', assignedToId: '',
  priority: '', channel: '', dnf: '', branchId: '',
};

const STATUS_STYLE = {
  WON:       'text-emerald-700 bg-emerald-50 border-emerald-200',
  LOST:      'text-red-600 bg-red-50 border-red-200',
  PENDING:   'text-amber-600 bg-amber-50 border-amber-200',
  CANCELLED: 'text-gray-500 bg-gray-100 border-gray-200',
};
const PRIORITY_STYLE = {
  HIGH:   'text-red-600 bg-red-50 border-red-200',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  LOW:    'text-slate-500 bg-slate-50 border-slate-200',
};
const STAGE_BAR = ['bg-pink-500', 'bg-blue-500', 'bg-gray-900', 'bg-gray-900', 'bg-gray-900'];
const PRIORITY_BAR = { HIGH: 'bg-red-500', MEDIUM: 'bg-amber-500', LOW: 'bg-slate-400' };

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null));
const pctOf = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

export default function LeadReportPage({ instore = false }) {
  const catalog = instore ? INSTORE_COLUMNS : COLUMNS;
  const { lookups } = useLookups();
  const { globalParams } = useGlobalFilter();

  const [draft, setDraft]     = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [tab, setTab]         = useState('all');
  const [page, setPage]       = useState(1);
  const [columns, setColumns] = useState(instore ? INSTORE_DEFAULT : DEFAULT_COLUMNS);

  const [summary, setSummary]   = useState(null);
  const [rows, setRows]         = useState({ data: [], total: 0, pages: 1, limit: 20 });
  const [insights, setInsights] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [exporting, setExporting] = useState(false);

  // The instore report is always locked to the instore channel
  const queryParams = useCallback(
    () => ({
      ...(globalParams.branchId ? { branchId: globalParams.branchId } : {}),
      ...clean(applied),
      ...(instore ? { channel: 'INSTORE' } : {}),
    }),
    [applied, globalParams, instore],
  );

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = queryParams();
      const [s, list] = await Promise.all([
        api.get('/reports/leads/summary', { params }),
        tab === 'all'
          ? api.get('/reports/leads', { params: { ...params, page, limit: 20 } })
          : api.get('/reports/leads/customers', { params }),
      ]);
      setSummary(s.data);
      if (tab === 'all') setRows(list.data); else setInsights(list.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load lead report');
    } finally { setLoading(false); }
  }, [queryParams, tab, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const apply = () => { setApplied(draft); setPage(1); };
  const clear = () => { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setPage(1); };
  const setField = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const toggleColumn = (key) =>
    setColumns((cols) => {
      if (cols.includes(key)) return cols.length === 1 ? cols : cols.filter((c) => c !== key);
      return catalog.map((c) => c.key).filter((k) => cols.includes(k) || k === key); // keep catalogue order
    });

  const exportCsv = async () => {
    setExporting(true); setError('');
    try {
      const res = await api.get('/reports/leads/export', {
        params: { ...queryParams(), columns: columns.join(',') },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), { href: url, download: instore ? 'instore-lead-report.csv' : 'lead-report.csv' });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('CSV export failed. Please try again.');
    } finally { setExporting(false); }
  };

  const t = summary?.totals;
  const total = t?.total || 0;

  const filtersPanel = (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 print:hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Field label="Customer Name"><input value={draft.name} onChange={setField('name')} placeholder="Search name..." className={INPUT} /></Field>
        <Field label="Phone Number"><input value={draft.phone} onChange={setField('phone')} placeholder="Search phone..." className={INPUT} /></Field>
        <Field label="Marriage From Date"><input type="date" value={draft.marriageFrom} onChange={setField('marriageFrom')} className={INPUT} /></Field>
        <Field label="Marriage To Date"><input type="date" value={draft.marriageTo} onChange={setField('marriageTo')} className={INPUT} /></Field>
        <Field label="Created From Date"><input type="date" value={draft.createdFrom} onChange={setField('createdFrom')} className={INPUT} /></Field>

        <Field label="Created To Date"><input type="date" value={draft.createdTo} onChange={setField('createdTo')} className={INPUT} /></Field>
        <Field label="Stage">
          <Select value={draft.stageId} onChange={setField('stageId')} all="All Stages" options={lookups.stages.map((s) => [s.id, s.name])} />
        </Field>
        <Field label="Status">
          <Select value={draft.status} onChange={setField('status')} all="All Statuses"
            options={[['PENDING', 'Pending'], ['WON', 'Won'], ['LOST', 'Lost'], ['CANCELLED', 'Cancelled']]} />
        </Field>
        <Field label="Lead Source">
          <Select value={draft.sourceId} onChange={setField('sourceId')} all="All Lead Sources" options={lookups.sources.map((s) => [s.id, s.name])} />
        </Field>
        <Field label="Created By / Owner">
          <Select value={draft.createdById} onChange={setField('createdById')} all="All Owners / Staff" options={lookups.staff.map((s) => [s.id, s.name])} />
        </Field>

        <Field label="Assigned To">
          <Select value={draft.assignedToId} onChange={setField('assignedToId')} all="All Assigned Users" options={lookups.staff.map((s) => [s.id, s.name])} />
        </Field>
        <Field label="Priority">
          <Select value={draft.priority} onChange={setField('priority')} all="All Priorities" options={[['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']]} />
        </Field>
        {!instore && (
          <Field label="Channel">
            <Select value={draft.channel} onChange={setField('channel')} all="All Channels" options={[['OUTDOOR', 'Outdoor'], ['INSTORE', 'Instore']]} />
          </Field>
        )}
        <Field label="Date Not Fixed (DNF)">
          <Select value={draft.dnf} onChange={setField('dnf')} all="All" options={[['yes', 'Yes'], ['no', 'No']]} />
        </Field>
        <Field label="Branch">
          <Select value={draft.branchId} onChange={setField('branchId')} all="All Branches" options={lookups.branches.map((b) => [b.id, b.name])} />
        </Field>
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={apply} className="px-8 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold">Apply</button>
        <button onClick={clear} className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Clear</button>
      </div>
    </section>
  );

  const recordsTable = (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((k) => (
                <th key={k} className="text-left text-[11px] font-semibold text-gray-500 tracking-wide uppercase px-4 py-3 whitespace-nowrap">
                  {catalog.find((c) => c.key === k).label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={columns.length} className="text-center text-gray-400 py-10">Loading…</td></tr>}
            {!loading && rows.data.length === 0 && (
              <tr><td colSpan={columns.length} className="text-center text-gray-400 py-10">No leads match these filters</td></tr>
            )}
            {!loading && rows.data.map((r) => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                {columns.map((k) => <td key={k} className="px-4 py-3 text-gray-700 whitespace-nowrap">{cell(k, r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 print:hidden">
        <Pagination page={page} pages={rows.pages} total={rows.total} limit={rows.limit} onPage={setPage} />
      </div>
    </>
  );

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
              <h1 className="text-xl font-bold text-gray-900">{instore ? 'Instore Lead Report' : 'Lead Management Report'}</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">
                {instore ? 'Walk-in Analytics' : 'Pipeline Analytics'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {instore ? 'Walk-in lead records, conversions and purchase dates' : 'Advanced analytics and sales conversion summary'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          {!instore && (
            <>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
                <div>
                  <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL LEADS</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total.toLocaleString('en-IN')}</p>
                </div>
                <Users className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex rounded-lg bg-gray-100 p-0.5">
                {[['all', 'All Leads', Columns3], ['insights', 'Customer Insights', Users]].map(([id, label, Icon]) => (
                  <button
                    key={id}
                    onClick={() => { setTab(id); setPage(1); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>

              <ColumnPicker catalog={catalog} columns={columns} onToggle={toggleColumn} />
            </>
          )}

          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Printer className="w-3.5 h-3.5" /> Print Report
          </button>
          <button
            onClick={exportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* ── Instore layout: cards → filters → records ─────────────── */}
      {instore && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <IconCard label="TOTAL LEADS" value={total} icon={Users} tile="bg-indigo-50 text-indigo-500" />
            <IconCard label="WON / CONVERTED" value={t?.won ?? 0} icon={CheckCircle2} tile="bg-emerald-50 text-emerald-500" />
            <IconCard label="PENDING / IN PROGRESS" value={t?.pending ?? 0} icon={Clock} tile="bg-amber-50 text-amber-500" />
            <IconCard label="LOST / CANCELLED" value={(t?.lost ?? 0) + (t?.cancelled ?? 0)} icon={XCircle} tile="bg-red-50 text-red-500" />
          </div>

          {filtersPanel}

          <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4 border-b border-gray-100">
              <h2 className="flex items-center gap-2.5 text-sm font-bold text-gray-900">
                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Table2 className="w-4 h-4 text-gray-500" /></span>
                Instore Lead Records
                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-md px-2 py-0.5">
                  {total.toLocaleString('en-IN')} TOTAL
                </span>
              </h2>
              <div className="flex items-center gap-2 print:hidden">
                <span className="text-[10px] font-semibold text-gray-400 tracking-wide">SELECT REPORT COLUMNS:</span>
                <ColumnPicker catalog={catalog} columns={columns} onToggle={toggleColumn} align="right" />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap px-5 py-3 bg-gray-50/60 border-b border-gray-100">
              <span className="text-[10px] font-semibold text-gray-400 tracking-wide mr-1">ACTIVE COLUMNS ({columns.length}):</span>
              {columns.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600 bg-gray-100 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> {catalog.find((c) => c.key === k).label}
                </span>
              ))}
            </div>

            {recordsTable}
          </section>
        </>
      )}

      {/* ── Lead Management layout: filters → cards → charts → table ── */}
      {!instore && (
        <>
          {filtersPanel}

          {summary && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Stat label="TOTAL LEADS" value={total.toLocaleString('en-IN')} icon={Users} iconClass="text-blue-500" hint="matching criteria" />
                <Stat label="WON DEALS" value={t.won.toLocaleString('en-IN')} icon={Check} iconClass="text-emerald-500"
                  hint={`${(total ? (t.won / total) * 100 : 0).toFixed(1)}% of total`} hintClass="text-emerald-600" />
                <Stat label="LOST DEALS" value={t.lost.toLocaleString('en-IN')} icon={X} iconClass="text-red-500"
                  hint={`${(total ? (t.lost / total) * 100 : 0).toFixed(1)}% of total`} hintClass="text-red-500" />
                <Stat label="PENDING DEALS" value={t.pending.toLocaleString('en-IN')} icon={Activity} iconClass="text-amber-500"
                  hint={`${(total ? (t.pending / total) * 100 : 0).toFixed(1)}% of total`} hintClass="text-amber-600" />
                <Stat label="CANCELLED" value={t.cancelled.toLocaleString('en-IN')} icon={X} iconClass="text-gray-400"
                  hint={`${(total ? (t.cancelled / total) * 100 : 0).toFixed(1)}% of total`} />
                <Stat label="CONVERSION RATE" value={`${t.conversionRate.toFixed(1)}%`} icon={TrendingUp} iconClass="text-purple-500" valueClass="text-purple-600"
                  hint={t.avgWeight == null ? 'No expected weight data' : `Avg: ${t.avgWeight.toFixed(2)}g exp. weight`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Panel title="LEADS BY PIPELINE STAGE" icon={Briefcase} iconClass="text-blue-500">
                  {summary.byStage.length === 0 ? <Empty /> : summary.byStage.map((s, i) => (
                    <BarRow key={s.name} label={s.name} count={s.count} pct={pctOf(s.count, total)} color={STAGE_BAR[i] || 'bg-gray-900'} />
                  ))}
                </Panel>

                <Panel title="LEADS BY PRIORITY LEVEL" icon={AlertCircle} iconClass="text-red-500">
                  {total === 0 ? <Empty /> : summary.byPriority.map((p) => (
                    <BarRow key={p.name} label={p.name} count={p.count} pct={pctOf(p.count, total)} color={PRIORITY_BAR[p.name]}
                      labelClass={p.name === 'HIGH' ? 'text-red-600' : p.name === 'MEDIUM' ? 'text-amber-600' : 'text-slate-500'} />
                  ))}
                </Panel>

                <Panel title="LOSS REASON BREAKDOWN" icon={ListX} iconClass="text-rose-500">
                  {summary.lossReasons.length === 0 ? <Empty text="No loss reasons recorded" /> : summary.lossReasons.map((r, i) => (
                    <BarRow key={r.reason} rank={i + 1} label={r.reason} count={r.count} pct={pctOf(r.count, t.lost)} color="bg-red-400" />
                  ))}
                </Panel>
              </div>

              {tab === 'all' ? (
                <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">{recordsTable}</section>
              ) : (
                <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <p className="px-4 pt-4 text-xs text-gray-400">Top 50 customers by number of leads, under the current filters</p>
                  <table className="w-full text-sm mt-2">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['CUSTOMER', 'PHONE', 'LEADS', 'WON', 'LOST', 'EXPECTED AMOUNT'].map((h) => (
                          <th key={h} className="text-left text-[11px] font-semibold text-gray-500 tracking-wide px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {insights.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-10">No customers found</td></tr>}
                      {insights.map((c) => (
                        <tr key={c.contactId} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                          <td className="px-4 py-3 font-mono">{c.leads}</td>
                          <td className="px-4 py-3 font-mono text-emerald-600">{c.won}</td>
                          <td className="px-4 py-3 font-mono text-red-500">{c.lost}</td>
                          <td className="px-4 py-3 font-mono">₹{Math.round(c.expectedAmount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function ColumnPicker({ catalog, columns, onToggle, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close when clicking elsewhere
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <Columns3 className="w-3.5 h-3.5" /> {columns.length} Columns Selected <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      {open && (
        <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1 z-20 w-60 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2`}>
          {catalog.map((c) => (
            <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={columns.includes(c.key)} onChange={() => onToggle(c.key)} className="accent-pink-500" />
              {c.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function cell(key, r) {
  const v = r[key];
  if (key === 'status')   return <Pill className={STATUS_STYLE[v]}>{v}</Pill>;
  if (key === 'priority') return <Pill className={PRIORITY_STYLE[v]}>{v}</Pill>;
  if (key === 'expectedAmount') return v === '' ? '—' : `₹${Number(v).toLocaleString('en-IN')}`;
  return v === '' || v == null ? <span className="text-gray-300">—</span> : v;
}

function Pill({ className = '', children }) {
  return <span className={`inline-block text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${className}`}>{children}</span>;
}

function IconCard({ label, value, icon: Icon, tile }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center gap-4">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tile}`}><Icon className="w-5 h-5" /></span>
      <div>
        <p className="text-[10px] font-semibold text-gray-500 tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 font-mono">{Number(value).toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, iconClass, hint, hintClass = 'text-gray-400', valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold text-gray-500 tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>
      <p className={`text-3xl font-bold mt-2 ${valueClass}`}>{value}</p>
      <p className={`text-[11px] mt-1 ${hintClass}`}>{hint}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, iconClass, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <h2 className="flex items-center gap-2 text-xs font-bold text-gray-800 tracking-widest mb-4">
        <Icon className={`w-4 h-4 ${iconClass}`} /> {title}
      </h2>
      <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">{children}</div>
    </section>
  );
}

function BarRow({ rank, label, count, pct, color, labelClass = 'text-gray-800' }) {
  return (
    <div className="flex items-start gap-2.5">
      {rank && <span className="w-5 h-5 rounded-full bg-red-50 text-red-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{rank}</span>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 text-xs mb-1">
          <span className={`font-semibold truncate ${labelClass}`} title={label}>{label}</span>
          <span className="text-gray-400 font-mono shrink-0">{count.toLocaleString('en-IN')} ({pct}%)</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-900/90 overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }} />
        </div>
      </div>
    </div>
  );
}

function Empty({ text = 'No data for these filters' }) {
  return <p className="text-xs text-gray-400 py-6 text-center">{text}</p>;
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-600 mb-1.5">{label}</label>
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

const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';
