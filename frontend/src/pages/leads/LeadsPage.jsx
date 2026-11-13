import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Upload, Download, Filter, CheckSquare, Users, Maximize2,
  Phone, Link2, Building2, Calendar, ArrowRight, MoreVertical,
  CheckCircle2, CircleDot, Pencil, Eye, History, Activity,
} from 'lucide-react';
import useLeads    from '../../hooks/useLeads.js';
import useLookups  from '../../hooks/useLookups.js';
import { useAuth } from '../../context/AuthContext.jsx';
import api         from '../../services/api.js';
import Pagination  from '../../components/ui/Pagination.jsx';
import FilterBar   from '../../components/ui/FilterBar.jsx';
import Button      from '../../components/ui/Button.jsx';
import Badge       from '../../components/ui/Badge.jsx';
import LeadFormModal from './LeadFormModal.jsx';
import ImportModal   from './ImportModal.jsx';
import { WonLossModal, LeadStatusModal, HistoryModal, Customer360Modal } from './LeadActionModals.jsx';

const SUB_TABS = [
  { id: 'all',      label: 'All Leads',     view: ''         },
  { id: 'created',  label: 'Created Leads', view: 'created'  },
  { id: 'tasks',    label: "Today's Tasks", view: 'today'    },
  { id: 'overdue',  label: 'Overdue',       view: 'overdue'  },
  { id: 'upcoming', label: 'Upcoming',      view: 'upcoming' },
];

const MENU = [
  { key: 'winloss',  label: 'Won/Loss Status', icon: CheckCircle2, tint: 'text-emerald-500' },
  { key: 'status',   label: 'Lead Status',     icon: CircleDot,    tint: 'text-blue-500'    },
  { key: 'edit',     label: 'Edit Details',    icon: Pencil,       tint: 'text-blue-500'    },
  { key: 'view',     label: 'View',            icon: Eye,          tint: 'text-blue-500'    },
  { key: 'history',  label: 'History Log',     icon: History,      tint: 'text-gray-500'    },
  { key: 'c360',     label: 'Customer 360',    icon: Activity,     tint: 'text-purple-500'  },
];

const PRIORITY_STYLE = {
  HIGH:   'text-red-600 bg-red-50 border-red-300',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-300',
  LOW:    'text-slate-500 bg-slate-50 border-slate-300',
};

const fmt = (d, utc) => (d ? new Date(d).toLocaleDateString('en-GB', utc ? { timeZone: 'UTC' } : undefined) : '—');

export default function LeadsPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { lookups } = useLookups();

  const [subTab, setSubTab] = useState('all');
  const view = SUB_TABS.find((t) => t.id === subTab).view;

  const {
    data, total, pages, page, setPage,
    search, setSearch, filters, setFilter, clearFilters,
    loading, error, limit,
    createLead, updateLead, bulkAssign, winLead, loseLead, refetch,
  } = useLeads('OUTDOOR', view);

  const [formOpen, setFormOpen]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [importOpen, setImportOpen]   = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected]       = useState(new Set());
  const [assigneeId, setAssigneeId]   = useState('');
  const [assigning, setAssigning]     = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [menu, setMenu]               = useState(null);   // { lead, top, left }
  const [dialog, setDialog]           = useState(null);   // { type, lead }
  const [notice, setNotice]           = useState('');
  const menuRef = useRef(null);

  const canSeeAll    = user?.role !== 'SALES';
  const isAdminOrMgr = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const todayStr     = new Date().toLocaleDateString('en-CA');

  // Leads without a deal yet sit in the first active pipeline stage
  const firstStageName = useMemo(
    () => [...lookups.stages].filter((s) => s.isActive !== false).sort((a, b) => a.order - b.order)[0]?.name || '',
    [lookups.stages],
  );

  // Close the row menu on outside click, scroll, resize or Escape
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) close(); };
    const onKey  = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const openMenu = (e, lead) => {
    const r = e.currentTarget.getBoundingClientRect();
    const height = MENU.length * 36 + 12;
    setMenu({
      lead,
      left: Math.max(8, r.right - 192),
      top:  r.bottom + height > window.innerHeight ? Math.max(8, r.top - height - 4) : r.bottom + 4,
    });
  };

  const runAction = (key, lead) => {
    setMenu(null);
    if (key === 'view') return navigate(`/leads/${lead.id}`);
    if (key === 'edit') { setEditing(lead); setFormOpen(true); return undefined; }
    return setDialog({ type: key, lead });
  };

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected((s) => (s.size === data.length ? new Set() : new Set(data.map((r) => r.id))));

  const handleBulkAssign = async () => {
    if (!assigneeId || selected.size === 0) return;
    setAssigning(true);
    try { await bulkAssign({ leadIds: [...selected], assignedToId: assigneeId }); setSelected(new Set()); }
    finally { setAssigning(false); }
  };

  const handleSave = async (form) => {
    if (editing) await updateLead(editing.id, form);
    else         await createLead(form);
  };

  const myTasks = () => { setSubTab('tasks'); if (user?.id) setFilter('assignedToId', user.id); };

  const exportCsv = async () => {
    setExporting(true); setNotice('');
    try {
      const params = { channel: 'OUTDOOR' };
      if (search) params.name = search;
      ['sourceId', 'branchId', 'assignedToId'].forEach((k) => { if (filters[k]) params[k] = filters[k]; });
      const res = await api.get('/reports/leads/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement('a'), { href: url, download: 'leads.csv' });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { setNotice('Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">Leads</h1>
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md tracking-wide uppercase">Sales Pipeline</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Track client leads, manage conversion stages, and assign follow-up tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white mr-1">
              <div>
                <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL LEADS</p>
                <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total.toLocaleString('en-IN')}</p>
              </div>
              <Users className="w-5 h-5 text-gray-300 ml-1" />
            </div>

            <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500" aria-label="Expand"><Maximize2 className="w-4 h-4" /></button>

            <button onClick={myTasks} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600">
              <CheckSquare className="w-4 h-4" /> My Tasks
            </button>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                filtersOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={exportCsv} disabled={exporting} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 disabled:opacity-60">
              <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export'}
            </button>
            <button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Lead
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-4 flex-wrap">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                subTab === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.id === 'created' && <Users className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex flex-wrap items-center gap-2">
          <FilterBar search={search} onSearch={setSearch} placeholder="Search by name, phone, email…" onClear={clearFilters} />
          <FilterSelect label="Status" value={filters.statusId} onChange={(v) => setFilter('statusId', v)} options={lookups.statuses} />
          <FilterSelect label="Source" value={filters.sourceId} onChange={(v) => setFilter('sourceId', v)} options={lookups.sources} />
          {canSeeAll && <FilterSelect label="Branch" value={filters.branchId} onChange={(v) => setFilter('branchId', v)} options={lookups.branches} />}
          {isAdminOrMgr && <FilterSelect label="Staff" value={filters.assignedToId} onChange={(v) => setFilter('assignedToId', v)} options={lookups.staff} />}
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>
      )}

      {/* Bulk assign */}
      {selected.size > 0 && isAdminOrMgr && (
        <div className="flex items-center gap-3 bg-indigo-50 border-b border-indigo-200 px-6 py-2.5 text-sm">
          <span className="font-medium text-indigo-700">{selected.size} selected</span>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
            <option value="">Assign to…</option>
            {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button size="sm" loading={assigning} onClick={handleBulkAssign}>Assign</Button>
          <button onClick={() => setSelected(new Set())} className="text-gray-500 hover:text-gray-700 ml-auto">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {(error || notice) && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error || notice}</div>}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {isAdminOrMgr && (
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label="Select all" onChange={toggleAll} checked={data.length > 0 && selected.size === data.length} className="rounded" />
                  </th>
                )}
                {['NAME / DATE', 'CONTACT / AREA', ...(canSeeAll ? ['BRANCH'] : []), 'LEAD SOURCE', 'STAGE', 'STATUS', 'LEAD STATUS', 'PRIORITY', 'CREATED DATE', 'DUE DATE', 'ASSIGNED EMPLOYEE', 'ACTIONS'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={13} className="text-center text-gray-400 py-12">Loading…</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={13} className="text-center text-gray-400 py-12">No leads found</td></tr>}

              {!loading && data.map((lead) => {
                const pending = !lead.isWon && !lead.isLost;
                const dueStr  = lead.dueDate ? lead.dueDate.slice(0, 10) : '';
                const dueNow  = pending && dueStr && dueStr <= todayStr;
                return (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50/70 align-top">
                    {isAdminOrMgr && (
                      <td className="px-4 py-4">
                        <input type="checkbox" aria-label={`Select ${lead.firstName}`} checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="rounded" />
                      </td>
                    )}

                    <td className="px-4 py-4">
                      <p className="text-[10px] text-indigo-500 font-medium">{fmt(lead.createdAt)}</p>
                      <button onClick={() => navigate(`/leads/${lead.id}`)} className="text-sm font-semibold text-gray-900 hover:text-indigo-600 text-left">
                        {lead.firstName} {lead.lastName}
                      </button>
                    </td>

                    <td className="px-4 py-4 text-xs text-gray-600 space-y-1 whitespace-nowrap">
                      <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" /> {lead.phone || '—'}</p>
                      {lead.altPhone && <p className="flex items-center gap-1.5"><Link2 className="w-3 h-3 text-gray-400" /> {lead.altPhone} <span className="text-gray-400">(Alt)</span></p>}
                      {lead.area && <p className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-gray-400" /> {lead.area}</p>}
                    </td>

                    {canSeeAll && <td className="px-4 py-4 text-xs font-semibold text-gray-800 uppercase max-w-[160px]">{lead.branch?.name || '—'}</td>}

                    <td className="px-4 py-4">
                      {lead.source?.name
                        ? <span className="inline-block text-[11px] text-gray-700 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">{lead.source.name}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-4 py-4 text-[11px] font-bold text-gray-800 uppercase tracking-wide max-w-[90px]">
                      {lead.stage?.name || firstStageName || '—'}
                    </td>

                    <td className="px-4 py-4"><StatusCell lead={lead} /></td>

                    <td className="px-4 py-4">
                      {lead.status ? <Badge label={lead.status.name} color={lead.status.color} /> : <span className="text-gray-300">-</span>}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-block text-[10px] font-bold rounded-full px-3 py-1 border ${PRIORITY_STYLE[lead.priority] || PRIORITY_STYLE.MEDIUM}`}>{lead.priority}</span>
                    </td>

                    <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">{fmt(lead.createdAt)}</td>

                    <td className="px-4 py-4 text-xs whitespace-nowrap">
                      {lead.dueDate ? (
                        <span className={`flex items-center gap-1.5 font-medium ${dueNow ? 'text-orange-500' : 'text-gray-700'}`}>
                          <Calendar className={`w-3.5 h-3.5 ${dueNow ? 'text-orange-500' : 'text-emerald-500'}`} /> {fmt(lead.dueDate, true)}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-4 py-4">
                      {lead.assignedTo ? (
                        <span className="flex items-center gap-2 text-xs text-gray-700 whitespace-nowrap">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {lead.assignedTo.name[0]}
                          </span>
                          {lead.assignedTo.name}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/leads/${lead.id}`)} aria-label={`Open ${lead.firstName}`}
                          className="p-1.5 rounded-md text-orange-500 hover:bg-orange-50"><ArrowRight className="w-4 h-4" /></button>
                        <button onClick={(e) => openMenu(e, lead)} aria-label="More actions" aria-haspopup="menu"
                          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />
      </div>

      {/* Row action menu */}
      {menu && (
        <div ref={menuRef} role="menu" style={{ top: menu.top, left: menu.left }}
          className="fixed z-50 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5">
          {MENU.map(({ key, label, icon: Icon, tint }) => (
            <button key={key} role="menuitem" onClick={() => runAction(key, menu.lead)}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Icon className={`w-4 h-4 ${tint}`} /> {label}
            </button>
          ))}
        </div>
      )}

      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSave={handleSave} lookups={lookups} />
      <ImportModal   open={importOpen} onClose={() => setImportOpen(false)} onDone={refetch} />

      <WonLossModal
        open={dialog?.type === 'winloss'} lead={dialog?.lead} lostReasons={lookups.lostReasons}
        onWin={winLead} onLose={loseLead} onClose={() => setDialog(null)}
      />
      <LeadStatusModal
        open={dialog?.type === 'status'} lead={dialog?.lead} statuses={lookups.statuses}
        onSave={updateLead} onClose={() => setDialog(null)}
      />
      <HistoryModal open={dialog?.type === 'history'} lead={dialog?.lead} onClose={() => setDialog(null)} />
      <Customer360Modal open={dialog?.type === 'c360'} lead={dialog?.lead} onClose={() => setDialog(null)} />
    </div>
  );
}

function StatusCell({ lead }) {
  if (lead.isWon) {
    const deal = lead.deals?.[0];
    return (
      <div className="space-y-0.5">
        <Pill className="text-emerald-700 bg-emerald-50 border-emerald-200">WON</Pill>
        {deal && (
          <div className="text-[10px] text-gray-500 leading-snug mt-1">
            <p>Date: {fmt(deal.updatedAt)}</p>
            <p>Rev: {Number(deal.value).toFixed(2)}</p>
            {deal.invoiceRef && <p className="max-w-[170px] truncate" title={deal.invoiceRef}>Rem: {deal.invoiceRef}</p>}
          </div>
        )}
      </div>
    );
  }
  if (lead.isLost) {
    return (
      <div>
        <Pill className="text-red-600 bg-red-50 border-red-200">LOST</Pill>
        {lead.lossReason && <p className="text-[10px] italic text-gray-500 mt-1 max-w-[170px]">Reason: {lead.lossReason}</p>}
      </div>
    );
  }
  if (/^cancelled$/i.test(lead.status?.name || '')) return <Pill className="text-gray-500 bg-gray-100 border-gray-200">CANCELLED</Pill>;
  return <Pill className="text-blue-600 bg-blue-50 border-blue-200">PENDING</Pill>;
}

function Pill({ className = '', children }) {
  return <span className={`inline-block text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${className}`}>{children}</span>;
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
      <option value="">All {label}s</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}
