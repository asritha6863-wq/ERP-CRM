import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Upload, Download, Filter, CheckSquare,
  Users, Maximize2, ExternalLink, UserCheck,
} from 'lucide-react';
import useLeads    from '../../hooks/useLeads.js';
import useLookups  from '../../hooks/useLookups.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DataTable   from '../../components/ui/DataTable.jsx';
import Pagination  from '../../components/ui/Pagination.jsx';
import FilterBar   from '../../components/ui/FilterBar.jsx';
import Button      from '../../components/ui/Button.jsx';
import Badge       from '../../components/ui/Badge.jsx';
import LeadFormModal from './LeadFormModal.jsx';
import ImportModal   from './ImportModal.jsx';

const SUB_TABS = [
  { id: 'all',      label: 'All Leads'      },
  { id: 'created',  label: 'Created Leads'  },
  { id: 'tasks',    label: "Today's Tasks"  },
  { id: 'overdue',  label: 'Overdue'        },
  { id: 'upcoming', label: 'Upcoming'       },
];

export default function LeadsPage() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { lookups }  = useLookups();
  const {
    data, total, pages, page, setPage,
    search, setSearch, filters, setFilter, clearFilters,
    loading, error, limit,
    createLead, updateLead, bulkAssign, convertLead, refetch,
  } = useLeads('OUTDOOR');

  const [formOpen, setFormOpen]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [importOpen, setImportOpen]   = useState(false);
  const [selected, setSelected]       = useState(new Set());
  const [assigneeId, setAssigneeId]   = useState('');
  const [assigning, setAssigning]     = useState(false);
  const [subTab, setSubTab]           = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected((s) => s.size === data.length ? new Set() : new Set(data.map((r) => r.id)));

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

  const canSeeAll    = user?.role !== 'SALES';
  const isAdminOrMgr = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const columns = [
    {
      key: '_check',
      header: <input type="checkbox" onChange={toggleAll} checked={selected.size === data.length && data.length > 0} className="rounded" />,
      render: (_, row) => <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded" />,
      className: 'w-10',
    },
    {
      key: 'firstName',
      header: 'NAME / DATE',
      render: (_, row) => (
        <div>
          <button onClick={() => navigate(`/leads/${row.id}`)} className="text-indigo-600 hover:underline font-medium flex items-center gap-1 text-sm">
            {row.firstName} {row.lastName}
            <ExternalLink className="w-3 h-3" />
          </button>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(row.createdAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'CONTACT / AREA',
      render: (_, row) => (
        <div>
          <p className="text-sm text-gray-700">{row.phone || '—'}</p>
          <p className="text-xs text-gray-400">{row.email || ''}</p>
        </div>
      ),
    },
    ...(canSeeAll ? [{
      key: 'branch',
      header: 'BRANCH',
      render: (_, row) => <span className="text-sm text-gray-700">{row.branch?.name || '—'}</span>,
    }] : []),
    {
      key: 'source',
      header: 'LEAD SOURCE',
      render: (_, row) => row.source?.name
        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">{row.source.name}</span>
        : <span className="text-gray-400 text-sm">—</span>,
    },
    {
      key: 'stage',
      header: 'STAGE',
      render: (_, row) => (
        <span className="text-sm text-gray-700 font-medium">
          {row.isWon ? 'Won' : row.isLost ? 'Lost' : row.isConverted ? 'Converted' : 'New Lead'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      render: (_, row) => {
        if (row.isWon)  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">WON</span>;
        if (row.isLost) return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">LOST</span>;
        return row.status
          ? <Badge label={row.status.name} color={row.status.color} />
          : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-600 border border-orange-200">PENDING</span>;
      },
    },
    {
      key: 'assignedTo',
      header: 'ASSIGNED EMPLOYEE',
      render: (_, row) => row.assignedTo
        ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {row.assignedTo.name[0]}
            </div>
            <span className="text-sm text-gray-700">{row.assignedTo.name}</span>
          </div>
        )
        : <span className="text-gray-400 text-sm">—</span>,
    },
    {
      key: '_actions',
      header: '',
      className: 'w-16',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditing(row); setFormOpen(true); }}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 text-xs">Edit</button>
          {!row.isConverted && !row.isWon && (
            <button onClick={() => convertLead(row.id)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-600">
              <UserCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ── Page Header ─────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">

          {/* Left — icon + title */}
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

          {/* Right — stats + actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Total leads counter */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white mr-1">
              <div>
                <p className="text-xs text-gray-400 leading-none">TOTAL LEADS</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{total.toLocaleString()}</p>
              </div>
              <Users className="w-5 h-5 text-gray-300 ml-1" />
            </div>

            <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500" title="Expand">
              <Maximize2 className="w-4 h-4" />
            </button>

            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600">
              <CheckSquare className="w-4 h-4" />
              My Tasks
            </button>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                filtersOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>

            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600">
              <Download className="w-4 h-4" />
              Export
            </button>

            <button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 mt-4">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                subTab === t.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.id === 'created' && <Users className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter Bar (collapsible) ─────────────────── */}
      {filtersOpen && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex flex-wrap items-center gap-2">
          <FilterBar search={search} onSearch={setSearch} placeholder="Search by name, phone, email…" onClear={clearFilters} />
          <FilterSelect label="Status"  value={filters.statusId}     onChange={(v) => setFilter('statusId', v)}     options={lookups.statuses} />
          <FilterSelect label="Source"  value={filters.sourceId}     onChange={(v) => setFilter('sourceId', v)}     options={lookups.sources}  />
          {canSeeAll   && <FilterSelect label="Branch" value={filters.branchId}     onChange={(v) => setFilter('branchId', v)}     options={lookups.branches} />}
          {isAdminOrMgr && <FilterSelect label="Staff"  value={filters.assignedToId} onChange={(v) => setFilter('assignedToId', v)} options={lookups.staff} />}
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>
      )}

      {/* ── Bulk assign bar ──────────────────────────── */}
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

      {/* ── Table ───────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
        <DataTable columns={columns} data={data} loading={loading} emptyMessage="No leads found" />
        <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />
      </div>

      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSave={handleSave} lookups={lookups} />
      <ImportModal   open={importOpen} onClose={() => setImportOpen(false)} onDone={refetch} />
    </div>
  );
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
